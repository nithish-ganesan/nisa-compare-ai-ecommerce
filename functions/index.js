const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

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

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });
const User = mongoose.models.User || mongoose.model("User", userSchema);
let databaseConnection;

async function connectDatabase() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured on the backend.");
  if (!databaseConnection) {
    databaseConnection = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  }
  try {
    await databaseConnection;
  } catch (error) {
    databaseConnection = undefined;
    throw error;
  }
}

function createToken(user) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured on the backend.");
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  return { id: user.id, email: user.email };
}

function readCredentials(body) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  return { email, password };
}

async function requireAuthentication(req, res, next) {
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ message: "Please log in to continue." });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("email");
    if (!user) return res.status(401).json({ message: "Your session has expired. Please log in again." });
    req.user = user;
    next();
  } catch (_error) {
    res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
}

const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";

app.get("/api/v1/health", (_req, res) => {
  res.json({ ok: true, service: "nisa-commerce-api" });
});

app.post("/api/v1/auth/register", async (req, res) => {
  try {
    await connectDatabase();
    const { email, password } = readCredentials(req.body);
    const existingUser = await User.exists({ email });
    if (existingUser) return res.status(409).json({ message: "An account already exists for this email. Please log in." });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash });
    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to create your account." });
  }
});

app.post("/api/v1/auth/login", async (req, res) => {
  try {
    await connectDatabase();
    const { email, password } = readCredentials(req.body);
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to log in." });
  }
});

app.get("/api/v1/auth/me", requireAuthentication, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get("/api/v1/sales", requireAuthentication, async (req, res) => {
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

app.post("/api/v1/compare", requireAuthentication, async (req, res) => {
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
    res.status(400).json({ message: error.message });
  }
});

function normalize(value) {
  return String(value || "").trim().toLowerCase();
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

if (require.main === module) {
  const port = Number(process.env.PORT || 8080);
  app.listen(port, "0.0.0.0", () => {
    console.log(`NiSa commerce API listening on ${port}`);
  });
}
