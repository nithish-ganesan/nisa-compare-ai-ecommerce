const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");

const USE_MEMORY_STORE = process.env.NISA_MEMORY_STORE === "true";

if (!USE_MEMORY_STORE) {
  admin.initializeApp();
}

const app = express();
const defaultAllowedOrigins = [
  "https://nisa-ecommerce.web.app",
  "https://nisa.ecommerce.nithishg.com"
];
const allowedOrigins = [
  ...defaultAllowedOrigins,
  ...String(process.env.NISA_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
];

app.use(express.json());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin not allowed by CORS."));
  }
}));

const db = USE_MEMORY_STORE ? null : admin.firestore();
const memoryStore = {
  users: new Map(),
  loginIndex: new Map(),
  sessions: new Map(),
  revokedSessions: new Set()
};

const ISSUER = "nisa-commerce-functions";
const AUDIENCE = "nisa-compare-portal";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const JWT_SECRET = process.env.NISA_JWT_SECRET || "firebase-functions-local-secret-change-before-production";
const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";

app.get("/api/v1/health", (_req, res) => {
  res.json({ ok: true, service: "nisa-commerce-api" });
});

app.post("/api/v1/auth/register", async (req, res) => {
  try {
    const username = normalize(req.body.username);
    const email = normalize(req.body.email);
    const password = String(req.body.password || "");
    validateRegistration(username, email, password);
    if (await findUser(username) || await findUser(email)) {
      throw new Error("Account already exists. Please login with your username or email.");
    }
    const user = {
      username,
      email,
      logins: [username, email],
      passwordHash: hashPassword(password),
      createdAt: Date.now()
    };
    await saveUser(user);
    res.json(await createSession(user));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/v1/auth/login", async (req, res) => {
  try {
    const login = normalize(req.body.login);
    const password = String(req.body.password || "");
    const user = await findUser(login);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new Error("Invalid username/email or password.");
    }
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
    await revokeSession(user.jwtId);
    res.status(204).send();
  } catch (_error) {
    res.status(204).send();
  }
});

app.get("/api/v1/sales", async (req, res) => {
  try {
    const today = new Date();
    const day = today.toISOString().slice(0, 10);
    const addDays = (days) => new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10);
    res.json([
      sale("Amazon", "Daily Deals", "Mobiles, appliances, audio", "Live deal page with rotating bank and coupon offers", "Offers vary by product and seller", day, addDays(1), "https://www.amazon.in/deals"),
      sale("Flipkart", "Today Deals", "Electronics, fashion, home", "Daily price drops and limited-time seller discounts", "Bank offers vary by product", day, addDays(1), "https://www.flipkart.com/offers-store"),
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
    const query = String(req.body.query || "").trim();
    if (!query) return res.status(400).json({ message: "Query is required." });
    const intent = extractIntent(query);
    const offers = rank(await searchSerpShopping(intent));
    const best = offers[0] || null;
    res.json({
      intent,
      recommendation: best
        ? `${best.platform} is the best value right now for ${best.productName} at ${formatPrice(best.price)} with a ${best.score} score.`
        : `No live Google Shopping results were found for ${intent.productName}. Try a more specific product name.`,
      summary: best
        ? `Found ${offers.length} live Google Shopping options for ${intent.productName}, sorted from lowest price to highest.`
        : "No live shopping rows available.",
      offers
    });
  } catch (error) {
    const status = /Authentication|token|Session/i.test(error.message) ? 401 : 400;
    res.status(status).json({ message: error.message });
  }
});

async function saveUser(user) {
  if (USE_MEMORY_STORE) {
    memoryStore.users.set(user.username, user);
    user.logins.forEach((login) => memoryStore.loginIndex.set(login, user.username));
    return;
  }
  await db.collection("users").doc(user.username).set({
    ...user,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function findUser(login) {
  const key = normalize(login);
  if (USE_MEMORY_STORE) {
    const username = memoryStore.loginIndex.get(key) || key;
    return memoryStore.users.get(username) || null;
  }
  const snapshot = await db.collection("users").where("logins", "array-contains", key).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0].data();
}

async function createSession(user) {
  const session = signToken(user);
  const sessionData = {
    username: user.username,
    email: user.email,
    createdAt: Date.now(),
    expiresAt: session.expiresAt
  };
  if (USE_MEMORY_STORE) {
    memoryStore.sessions.set(session.jwtId, sessionData);
  } else {
    await db.collection("sessions").doc(session.jwtId).set({
      ...sessionData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  return { token: session.token, username: user.username, email: user.email, expiresAt: session.expiresAt };
}

async function requireUser(req) {
  const header = req.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) throw new Error("Authentication required.");
  const claims = verifyToken(header.slice("Bearer ".length).trim());
  if (USE_MEMORY_STORE) {
    if (memoryStore.revokedSessions.has(claims.jti)) throw new Error("Authentication required.");
    if (!memoryStore.sessions.has(claims.jti)) {
      memoryStore.sessions.set(claims.jti, {
        username: claims.sub,
        email: claims.email,
        createdAt: Date.now(),
        expiresAt: claims.exp
      });
    }
  } else {
    const session = await db.collection("sessions").doc(claims.jti).get();
    if (!session.exists) throw new Error("Authentication required.");
  }
  return { username: claims.sub, email: claims.email, jwtId: claims.jti };
}

async function revokeSession(jwtId) {
  if (USE_MEMORY_STORE) {
    memoryStore.sessions.delete(jwtId);
    memoryStore.revokedSessions.add(jwtId);
    return;
  }
  await db.collection("sessions").doc(jwtId).delete();
}

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
    nbf: now,
    exp: expiresAt
  }));
  return { token: `${header}.${payload}.${hmac(`${header}.${payload}`)}`, jwtId, expiresAt };
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("Invalid token.");
  const [header, payload, signature] = parts;
  const expected = hmac(`${header}.${payload}`);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid token signature.");
  }
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== ISSUER) throw new Error("Invalid token issuer.");
  if (claims.aud !== AUDIENCE) throw new Error("Invalid token audience.");
  if (claims.nbf && claims.nbf > now) throw new Error("Token is not active yet.");
  if (claims.exp <= now) throw new Error("Session expired. Please login again.");
  return claims;
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

async function searchSerpShopping(intent) {
  if (!process.env.SERPAPI_KEY) {
    throw new Error("SerpAPI key is not configured on the backend.");
  }
  const url = new URL(SERPAPI_ENDPOINT);
  url.searchParams.set("engine", "google_shopping");
  url.searchParams.set("q", shoppingQuery(intent));
  url.searchParams.set("api_key", process.env.SERPAPI_KEY);
  url.searchParams.set("gl", intent.market === "ae" ? "ae" : "in");
  url.searchParams.set("hl", "en");

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`SerpAPI request failed with ${response.status}.`);
  const data = await response.json();
  const results = Array.isArray(data.shopping_results) ? data.shopping_results : [];
  const mapped = results.map((item, index) => toOffer(item, intent, index)).filter(Boolean);
  const relevant = mapped.filter((item) => isRelevantShoppingResult(item, intent));
  return (relevant.length > 0 ? relevant : mapped).slice(0, 12);
}

function toOffer(item, intent, index) {
  const price = extractPrice(item.extracted_price ?? item.price);
  const oldPrice = extractPrice(item.extracted_old_price ?? item.old_price ?? item.original_price);
  const source = cleanSource(item.source || item.merchant || item.seller || "Google Shopping");
  const productName = titleCase(item.title || intent.productName);
  const discount = extractDiscount(item, price, oldPrice);
  const rating = Number(item.rating || item.extracted_rating || 0) || null;
  const delivery = extractDelivery(item);
  const link = item.link || item.product_link || item.serpapi_product_api || searchUrl(source, productName);
  return {
    platform: source,
    productName,
    price,
    maximumRetailPrice: oldPrice && oldPrice > price ? oldPrice : null,
    discount,
    deliveryCharges: extractDeliveryCharges(item),
    estimatedDeliveryDate: delivery,
    sellerName: cleanSource(item.seller || item.merchant || source),
    rating,
    reviews: extractReviewCount(item),
    availableOffers: compact([item.snippet, item.tag, item.extensions?.join(", "), discount ? `${discount}% off` : null]),
    bankOffers: compact([item.offer, item.promotion, item.coupon, item.installments]),
    exchangeOffer: "Check seller page",
    emi: "Check seller page",
    warranty: "Check seller page",
    stockAvailability: item.in_stock === false ? "Check availability" : "Available on seller page",
    productUrl: link,
    score: 0,
    badges: buildBadges(index, discount, delivery, rating)
  };
}

function extractIntent(query) {
  const canonical = canonicalText(query);
  const brand = extractBrand(canonical);
  const productName = titleCase(canonical
    .replace(/\b(i\s+want\s+to\s+buy|want\s+to\s+buy|show\s+me|compare|buy|search|for|only)\b/gi, " ")
    .replace(/\b(?:under|below|less\s+than|within)\s*(?:rs\.?|inr|aed|₹)?\s*\d+[,.]?\d*\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim());
  return {
    productName: productName || titleCase(canonical),
    brand,
    variant: query,
    budget: extractBudget(canonical),
    market: /dubai|uae|aed/i.test(query) ? "ae" : "in"
  };
}

function shoppingQuery(intent) {
  return canonicalText(intent.variant)
    .replace(/\b(i\s+want\s+to\s+buy|want\s+to\s+buy|show\s+me|compare|buy|search|only)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim() || intent.productName;
}

function canonicalText(value) {
  let text = String(value || "").toLowerCase();
  [
    [/\b(epison|epsion)\b/g, "epson"],
    [/\blenvo\b/g, "lenovo"],
    [/\b(samsang|samsng)\b/g, "samsung"],
    [/\baddidas\b/g, "adidas"],
    [/\bone\s+plus\b/g, "oneplus"],
    [/\bfridge\b/g, "refrigerator"],
    [/\btv\b/g, "television"],
    [/\bac\b/g, "air conditioner"],
    [/\bmobile\b/g, "phone"]
  ].forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  return text.replace(/\s+/g, " ").trim();
}

function extractBrand(text) {
  const brands = ["apple", "samsung", "oneplus", "google", "vivo", "oppo", "xiaomi", "redmi", "realme", "nothing", "sony", "lg", "whirlpool", "godrej", "haier", "bosch", "dell", "hp", "lenovo", "asus", "acer", "epson", "canon", "brother", "nike", "adidas", "puma", "boat", "jbl", "durex", "skore", "manforce", "moods"];
  const found = brands.find((brand) => new RegExp(`\\b${brand}\\b`, "i").test(text));
  if (!found) return "Best brands shown below";
  if (found === "redmi") return "Xiaomi";
  if (["lg", "hp", "jbl"].includes(found)) return found.toUpperCase();
  if (found === "boat") return "boAt";
  return titleCase(found);
}

function isRelevantShoppingResult(offer, intent) {
  const text = canonicalText(`${offer.productName} ${offer.sellerName} ${offer.platform}`);
  const query = canonicalText(shoppingQuery(intent));
  const words = query.split(/\s+/).filter((word) => word.length > 2 && !/^(under|below|than|rs|inr|aed|with|for)$/.test(word));
  const matched = words.filter((word) => text.includes(word)).length;
  const wantsUsed = /\b(refurbished|renewed|used|second hand)\b/i.test(query);
  if (!wantsUsed && /\b(refurbished|renewed|used|second hand)\b/i.test(text)) return false;
  if (/\bphone\b/.test(query) && /\bcase|cover|charger|cable|protector|tempered|adapter|stand\b/.test(text)) return false;
  if (/\bprinter\b/.test(query) && /\bink|cartridge|toner|paper|cable\b/.test(text) && !/\bprinter\b/.test(text)) return false;
  return words.length === 0 || matched >= Math.min(2, words.length);
}

function rank(offers) {
  const priced = offers.filter((offer) => Number.isFinite(offer.price));
  const lowest = priced.length ? Math.min(...priced.map((offer) => offer.price)) : 0;
  return offers
    .map((offer) => ({ ...offer, score: score(offer, lowest) }))
    .sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER));
}

function score(offer, lowest) {
  if (!Number.isFinite(offer.price) || !lowest) return 40;
  const priceScore = Math.min(100, (lowest / Math.max(1, offer.price)) * 100);
  const ratingScore = offer.rating ? offer.rating * 18 : 70;
  const discountScore = Math.min(100, (offer.discount || 0) * 3);
  const deliveryScore = /free|tomorrow|today/i.test(offer.estimatedDeliveryDate || "") ? 95 : 70;
  return Math.max(0, Math.min(100, Math.round(priceScore * 0.55 + ratingScore * 0.2 + discountScore * 0.15 + deliveryScore * 0.1)));
}

function extractPrice(value) {
  if (typeof value === "number") return Math.round(value);
  const text = String(value || "").replace(/,/g, "");
  const match = text.match(/(?:₹|rs\.?|inr|aed|\$)?\s*(\d+(?:\.\d+)?)/i);
  return match ? Math.round(Number(match[1])) : null;
}

function extractBudget(text) {
  const match = String(text || "").match(/\b(?:under|below|less\s+than|within)\s*(?:rs\.?|inr|aed|₹)?\s*(\d+[,.]?\d*)\b/i);
  return match ? Number(match[1].replace(/[,.]/g, "")) : null;
}

function extractDiscount(item, price, oldPrice) {
  const text = `${item.price || ""} ${item.old_price || ""} ${item.snippet || ""} ${item.tag || ""} ${item.extensions?.join(" ") || ""}`;
  const explicit = text.match(/(\d{1,2})\s*%\s*off/i);
  if (explicit) return Number(explicit[1]);
  if (price && oldPrice && oldPrice > price) return Math.round(((oldPrice - price) / oldPrice) * 100);
  return 0;
}

function extractDelivery(item) {
  const text = [item.delivery, item.shipping, item.snippet, item.extensions?.join(" ")].filter(Boolean).join(" ");
  if (/free/i.test(text)) return "Free delivery";
  if (/tomorrow/i.test(text)) return "Tomorrow";
  if (/today/i.test(text)) return "Today";
  return text.match(/\b\d+\s*days?\b/i)?.[0] || "Check seller page";
}

function extractDeliveryCharges(item) {
  const text = [item.delivery, item.shipping, item.snippet].filter(Boolean).join(" ");
  if (/free/i.test(text)) return 0;
  const match = text.replace(/,/g, "").match(/(?:delivery|shipping).*?(?:₹|rs\.?|inr|aed)\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function extractReviewCount(item) {
  const value = item.reviews || item.extracted_reviews || item.number_of_reviews;
  if (typeof value === "number") return value;
  const match = String(value || "").replace(/,/g, "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function cleanSource(value) {
  return String(value || "Google Shopping").replace(/\s+-\s+Google Search$/i, "").trim();
}

function buildBadges(index, discount, delivery, rating) {
  return compact([
    index === 0 ? "Lowest Price" : null,
    discount ? "Discount" : null,
    /free|today|tomorrow/i.test(delivery || "") ? "Delivery Info" : null,
    rating ? "Rated" : null,
    "Live Shopping Price"
  ]);
}

function sale(platform, saleName, productCategory, discountText, bankOffer, startsOn, endsOn, saleUrl) {
  return { platform, saleName, productCategory, discountText, bankOffer, startsOn, endsOn, saleUrl };
}

function searchUrl(platform, productName) {
  const encoded = encodeURIComponent(productName).replace(/%20/g, "+");
  if (/amazon/i.test(platform)) return `https://www.amazon.in/s?k=${encoded}`;
  if (/flipkart/i.test(platform)) return `https://www.flipkart.com/search?q=${encoded}`;
  if (/croma/i.test(platform)) return `https://www.croma.com/search/?text=${encoded}`;
  if (/reliance/i.test(platform)) return `https://www.reliancedigital.in/search?q=${encoded}`;
  if (/myntra/i.test(platform)) return `https://www.myntra.com/${encoded.replace(/\+/g, "-")}`;
  return `https://www.google.com/search?q=${encoded}`;
}

function formatPrice(price) {
  return Number.isFinite(price) ? `Rs. ${price.toLocaleString("en-IN")}` : "the seller-listed price";
}

function titleCase(value) {
  return String(value || "").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()).trim();
}

function compact(values) {
  return values.filter((value) => value !== null && value !== undefined && String(value).trim() !== "");
}

exports.app = app;
exports.api = onRequest({ region: "asia-south1" }, app);

if (require.main === module) {
  const port = Number(process.env.PORT || 8080);
  app.listen(port, "0.0.0.0", () => {
    console.log(`NiSa commerce API listening on ${port}`);
  });
}
