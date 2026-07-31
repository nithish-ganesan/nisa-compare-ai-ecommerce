const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");

admin.initializeApp();

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

const db = admin.firestore();
const ISSUER = "nisa-commerce-functions";
const AUDIENCE = "nisa-compare-portal";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const JWT_SECRET = process.env.NISA_JWT_SECRET || "firebase-functions-local-secret-change-before-production";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function hmac(input) {
  return crypto.createHmac("sha256", JWT_SECRET).update(input).digest("base64url");
}

function signToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + TOKEN_TTL_SECONDS;
  const jwtId = crypto.randomUUID();
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: ISSUER,
    aud: AUDIENCE,
    sub: user.username,
    email: user.email,
    jti: jwtId,
    iat: now,
    exp: expiresAt
  }));
  const token = `${header}.${payload}.${hmac(`${header}.${payload}`)}`;
  return { token, jwtId, expiresAt };
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("Invalid token.");
  const [header, payload, signature] = parts;
  const expected = hmac(`${header}.${payload}`);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid token signature.");
  }
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== ISSUER) throw new Error("Invalid token issuer.");
  if (claims.aud !== AUDIENCE) throw new Error("Invalid token audience.");
  if (claims.exp <= now) throw new Error("Session expired. Please login again.");
  return claims;
}

async function requireUser(req) {
  const header = req.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) throw new Error("Authentication required.");
  const claims = verifyToken(header.slice("Bearer ".length).trim());
  const session = await db.collection("sessions").doc(claims.jti).get();
  if (!session.exists) throw new Error("Authentication required.");
  return { username: claims.sub, email: claims.email, jwtId: claims.jti };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 210000, 32, "sha256");
  return `${salt.toString("base64")}:${hash.toString("base64")}`;
}

function verifyPassword(password, stored) {
  const [saltText, hashText] = String(stored || "").split(":");
  if (!saltText || !hashText) return false;
  const salt = Buffer.from(saltText, "base64");
  const expected = Buffer.from(hashText, "base64");
  const actual = crypto.pbkdf2Sync(password, salt, 210000, 32, "sha256");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function validateRegistration(username, email, password) {
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error("Username must be 3-32 characters and use letters, numbers, dot, underscore, or hyphen.");
  }
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (!password || password.length < 10 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
    throw new Error("Password must be at least 10 characters and include letters and numbers.");
  }
}

async function createSession(user) {
  const session = signToken(user);
  await db.collection("sessions").doc(session.jwtId).set({
    username: user.username,
    email: user.email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: session.expiresAt
  });
  return { token: session.token, username: user.username, email: user.email, expiresAt: session.expiresAt };
}

app.post("/api/v1/auth/register", async (req, res) => {
  try {
    const username = normalize(req.body.username);
    const email = normalize(req.body.email);
    const password = String(req.body.password || "");
    validateRegistration(username, email, password);
    const existing = await db.collection("users").where("logins", "array-contains-any", [username, email]).limit(1).get();
    if (!existing.empty) throw new Error("Account already exists. Please login with your username or email.");
    await db.collection("users").doc(username).set({
      username,
      email,
      logins: [username, email],
      passwordHash: hashPassword(password),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json(await createSession({ username, email }));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/v1/auth/login", async (req, res) => {
  try {
    const login = normalize(req.body.login);
    const password = String(req.body.password || "");
    const snapshot = await db.collection("users").where("logins", "array-contains", login).limit(1).get();
    if (snapshot.empty) throw new Error("Invalid username/email or password.");
    const user = snapshot.docs[0].data();
    if (!verifyPassword(password, user.passwordHash)) throw new Error("Invalid username/email or password.");
    res.json(await createSession(user));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/v1/auth/me", async (req, res) => {
  try {
    const user = await requireUser(req);
    res.json({ username: user.username, email: user.email });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

app.post("/api/v1/auth/logout", async (req, res) => {
  try {
    const user = await requireUser(req);
    await db.collection("sessions").doc(user.jwtId).delete();
    res.status(204).send();
  } catch (error) {
    res.status(204).send();
  }
});

app.get("/api/v1/sales", async (req, res) => {
  try {
    await requireUser(req);
    const today = new Date();
    const day = today.toISOString().slice(0, 10);
    const addDays = (days) => new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10);
    res.json([
      sale("Amazon", "Daily Deals", "Mobiles, appliances, audio", "Up to 55% off on selected deals", "Bank and card offers vary by product", day, addDays(1), "https://www.amazon.in/deals"),
      sale("Flipkart", "Today Deals", "Electronics, fashion, home", "Lowest price drops refreshed daily", "Extra bank discount on eligible orders", day, addDays(1), "https://www.flipkart.com/offers-store"),
      sale("Croma", "Electronics Offers", "TVs, refrigerators, laptops", "Store and online appliance offers", "Card cashback on selected products", day, addDays(3), searchUrl("Croma", "electronics offers")),
      sale("Myntra", "Fashion Deals", "Shoes, clothing, accessories", "Brand offers and coupons", "Wallet and card cashback where available", day, addDays(2), searchUrl("Myntra", "fashion sale")),
      sale("Reliance Digital", "Gadget Deals", "Phones, laptops, home electronics", "Daily device offers", "No-cost EMI on eligible products", day, addDays(3), searchUrl("Reliance Digital", "sale"))
    ]);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

app.post("/api/v1/compare", async (req, res) => {
  try {
    await requireUser(req);
    const query = String(req.body.query || "").trim();
    if (!query) return res.status(400).json({ message: "Query is required." });
    const intent = extractIntent(query);
    const offers = rank(searchOffers(intent));
    const best = offers[0];
    res.json({
      intent,
      recommendation: `${best.platform} is the best value right now for ${best.productName} at Rs. ${best.price.toLocaleString("en-IN")} with a ${best.score} score.`,
      summary: intent.brand === "Unknown"
        ? `Found ${offers.length} brand options for ${intent.productName}, sorted from lowest price to highest.`
        : `Found ${offers.length} trusted options for ${offers[0].productName} across priority shopping providers.`,
      offers
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

function sale(platform, saleName, productCategory, discountText, bankOffer, startsOn, endsOn, saleUrl) {
  return { platform, saleName, productCategory, discountText, bankOffer, startsOn, endsOn, saleUrl };
}

function extractIntent(query) {
  const lower = query.toLowerCase();
  const brand = extractBrand(lower);
  const color = ["blue", "white", "pink", "green", "silver", "gold"].find((item) => lower.includes(item)) || "Black";
  const storage = (query.match(/(128|256|512)\s?gb/i)?.[0] || "256GB").replace(/\s+/g, "").toUpperCase();
  let productName = titleCase(query
    .replace(/\b(i\s+want\s+to\s+buy|want\s+to\s+buy|show\s+me|compare|buy|search|for|only)\b/gi, " ")
    .replace(/\b(?:under|below|less\s+than|within)\s*(?:rs\.?|inr|₹)?\s*\d+[,.]?\d*\b/gi, " ")
    .replace(new RegExp(`\\b${brand}\\b`, "i"), " ")
    .replace(/\s+/g, " ")
    .trim());
  const iphone = lower.match(/iphone\s*(\d{1,2})(?:\s*(pro|max|plus|mini))?/i);
  if (iphone) productName = `iPhone ${iphone[1]}${iphone[2] ? " " + titleCase(iphone[2]) : ""}`;
  return { productName: productName || "Product", brand: iphone ? "Apple" : brand, variant: query, storage, color: titleCase(color) };
}

function extractBrand(lower) {
  const brands = ["samsung", "oneplus", "google", "apple", "vivo", "oppo", "xiaomi", "redmi", "nike", "adidas", "puma", "sony", "lg", "dell", "hp", "lenovo", "boat", "jbl"];
  const found = brands.find((brand) => lower.includes(brand));
  if (!found) return "Unknown";
  if (found === "redmi") return "Xiaomi";
  if (found === "boat") return "boAt";
  if (found === "lg" || found === "hp" || found === "jbl") return found.toUpperCase();
  return titleCase(found);
}

function category(intent) {
  const text = `${intent.productName} ${intent.variant}`.toLowerCase();
  if (/iphone|galaxy|oneplus|pixel|phone|mobile/.test(text)) return "phone";
  if (/laptop|macbook|tablet|ipad|headphone|earbud|camera|watch/.test(text)) return "electronics";
  if (/tv|refrigerator|fridge|washing machine|air conditioner|microwave/.test(text)) return "appliance";
  if (/shoe|shirt|jeans|dress|jacket|sneaker/.test(text)) return "fashion";
  if (/rice|oil|atta|milk|coffee|tea/.test(text)) return "grocery";
  if (/condom|sanitary|pad|toothpaste|soap|shampoo|face wash|deodorant|razor/.test(text)) return "personal_care";
  if (/book|novel/.test(text)) return "book";
  return "general";
}

function searchOffers(intent) {
  const cat = category(intent);
  const budget = Number((intent.variant.match(/\b(?:under|below|less\s+than|within)\s*(?:rs\.?|inr|₹)?\s*(\d+[,.]?\d*)\b/i)?.[1] || "0").replace(/[,.]/g, ""));
  let base = basePrice(intent, cat);
  if (budget > 0) base = Math.min(base, Math.max(49, budget - Math.max(10, Math.round(budget / 20))));
  const brandAt = (index) => fallbackBrand(intent, cat, index);
  if (cat === "personal_care") {
    return [
      offer("Amazon", display(intent, brandAt(0)), clamp(base - delta(base, 9), budget), 12, 0, "Tomorrow", "Amazon Verified", 4.4, "Subscribe and save coupon", "ICICI instant discount", ["Lowest Price", "Fastest Delivery"]),
      offer("Flipkart", display(intent, brandAt(1)), clamp(base - delta(base, 5), budget), 10, 0, "2 days", "RetailNet", 4.3, "Combo pack offer", "Axis Bank offer", ["Best Bank Offer"]),
      offer("Tata 1mg", display(intent, brandAt(2)), clamp(base, budget), 8, 29, "2 days", "Tata 1mg", 4.2, "Health store coupon", "UPI cashback", []),
      offer("PharmEasy", display(intent, brandAt(3)), clamp(base + delta(base, 4), budget), 7, 29, "3 days", "PharmEasy", 4.1, "Care coupon", "Wallet cashback", [])
    ];
  }
  if (["appliance", "electronics", "phone"].includes(cat)) {
    return [
      offer("Flipkart", display(intent, brandAt(0)), clamp(base - delta(base, 4), budget), 10, 0, "2 days", "RetailNet", 4.4, "Exchange or coupon bonus", "Axis Bank offer", ["Lowest Price", "Best Bank Offer"]),
      offer("Amazon", display(intent, brandAt(1)), clamp(base, budget), 9, 0, "Tomorrow", "Amazon Verified", 4.5, "Fast delivery bundle", "ICICI instant discount", ["Fastest Delivery"]),
      offer("Reliance Digital", display(intent, brandAt(2)), clamp(base + delta(base, 1), budget), 9, 49, "3 days", "Reliance Retail", 4.2, "Store pickup available", "SBI discount", []),
      offer("Croma", display(intent, brandAt(3)), clamp(base + delta(base, 3), budget), 8, 99, "Tomorrow", "Croma Retail", 4.3, "Free setup support", "HDFC cashback", [])
    ];
  }
  return [
    offer("Flipkart", display(intent, brandAt(0)), clamp(base - delta(base, 4), budget), 10, 0, "2 days", "RetailNet", 4.4, "Exchange or coupon bonus", "Axis Bank offer", ["Lowest Price", "Best Bank Offer"]),
    offer("Amazon", display(intent, brandAt(1)), clamp(base, budget), 9, 0, "Tomorrow", "Amazon Verified", 4.5, "Fast delivery bundle", "ICICI instant discount", ["Fastest Delivery"]),
    offer("Meesho", display(intent, brandAt(2)), clamp(base - delta(base, 5), budget), 13, 59, "5 days", "Meesho Seller", 4.0, "Seller coupon", "UPI cashback", []),
    offer("Tata CLiQ", display(intent, brandAt(3)), clamp(base + delta(base, 2), budget), 8, 49, "3 days", "Tata CLiQ", 4.2, "CLiQ luxury coupon", "NeuCard offer", [])
  ];
}

function offer(platform, productName, price, discount, deliveryCharges, estimatedDeliveryDate, sellerName, rating, availableOffer, bankOffer, badges) {
  return { platform, productName, price, discount, deliveryCharges, estimatedDeliveryDate, sellerName, rating, availableOffers: [availableOffer], bankOffers: [bankOffer], exchangeOffer: "Exchange available where applicable", emi: "EMI availability varies by seller", warranty: "Warranty varies by product", stockAvailability: "In stock", productUrl: searchUrl(platform, productName), score: 0, badges };
}

function rank(offers) {
  const lowest = Math.min(...offers.map((offerItem) => offerItem.price));
  return offers.map((offerItem) => ({ ...offerItem, score: score(offerItem, lowest) })).sort((a, b) => a.price - b.price);
}

function score(offerItem, lowest) {
  const priceScore = Math.min(100, (lowest / Math.max(1, offerItem.price)) * 100);
  const ratingScore = offerItem.rating * 18;
  const discountScore = offerItem.discount * 2.2;
  const deliveryScore = offerItem.estimatedDeliveryDate === "Tomorrow" ? 14 : 8;
  const sellerScore = ["Amazon", "Apple Store"].includes(offerItem.platform) ? 10 : 7;
  return Math.max(0, Math.min(100, Math.round(priceScore * 0.42 + ratingScore * 0.22 + discountScore * 0.14 + deliveryScore * 0.12 + sellerScore * 0.1)));
}

function basePrice(intent, cat) {
  const text = `${intent.productName} ${intent.variant}`.toLowerCase();
  if (cat === "phone") return /iphone 16|s26|pixel 9/.test(text) ? 79490 : 72490;
  if (cat === "electronics") return /laptop|macbook/.test(text) ? 64990 : /watch/.test(text) ? 14990 : 8990;
  if (cat === "appliance") return /tv/.test(text) ? 45990 : /fridge|refrigerator/.test(text) ? 52990 : 32990;
  if (cat === "fashion") return 1999;
  if (cat === "personal_care") return /condom/.test(text) ? 249 : /toothpaste/.test(text) ? 129 : /soap/.test(text) ? 159 : 249;
  if (cat === "grocery") return /rice/.test(text) ? 799 : /milk/.test(text) ? 72 : 299;
  if (cat === "book") return 699;
  return /bottle/.test(text) ? 399 : /bag|backpack/.test(text) ? 899 : /charger|cable/.test(text) ? 499 : 1499;
}

function fallbackBrand(intent, cat, index) {
  if (intent.brand !== "Unknown") return intent.brand;
  const text = `${intent.productName} ${intent.variant}`.toLowerCase();
  const brands = /condom/.test(text) ? ["Durex", "Skore", "Manforce", "Moods"]
    : /fridge|refrigerator/.test(text) ? ["Whirlpool", "Samsung", "LG", "Godrej"]
    : /tv/.test(text) ? ["Mi", "Samsung", "LG", "Sony"]
    : /laptop/.test(text) ? ["Lenovo", "HP", "Dell", "ASUS"]
    : /shoe|sneaker/.test(text) ? ["Puma", "Red Tape", "Adidas", "Nike"]
    : cat === "appliance" ? ["LG", "Samsung", "Whirlpool", "Bosch"]
    : ["Lenovo", "Samsung", "Sony", "HP"];
  return brands[Math.min(index, brands.length - 1)];
}

function display(intent, fallback) {
  const brand = intent.brand === "Unknown" ? fallback : intent.brand;
  return `${brand} ${intent.productName}`.replace(/\s+/g, " ").trim();
}

function searchUrl(platform, productName) {
  const encoded = encodeURIComponent(productName).replace(/%20/g, "+");
  if (platform === "Amazon") return `https://www.amazon.in/s?k=${encoded}`;
  if (platform === "Flipkart") return `https://www.flipkart.com/search?q=${encoded}`;
  if (platform === "Croma") return `https://www.croma.com/search/?text=${encoded}`;
  if (platform === "Reliance Digital") return `https://www.reliancedigital.in/search?q=${encoded}`;
  if (platform === "Myntra") return `https://www.myntra.com/${encoded.replace(/\+/g, "-")}`;
  if (platform === "Tata 1mg") return `https://www.1mg.com/search/all?name=${encoded}`;
  if (platform === "PharmEasy") return `https://pharmeasy.in/search/all?name=${encoded}`;
  if (platform === "Meesho") return `https://www.meesho.com/search?q=${encoded}`;
  if (platform === "Tata CLiQ") return `https://www.tatacliq.com/search/?searchCategory=all&text=${encoded}`;
  return `https://www.google.com/search?q=${encoded}`;
}

function clamp(price, budget) {
  if (!budget || price <= budget) return Math.max(49, price);
  return Math.max(49, budget - Math.max(10, Math.round(budget / 20)));
}

function delta(price, percentage) {
  return Math.max(10, Math.round(price * percentage / 100));
}

function titleCase(value) {
  return String(value || "").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()).trim();
}

exports.api = onRequest({ region: "asia-south1" }, app);
