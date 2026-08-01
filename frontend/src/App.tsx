import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Bot,
  BadgePercent,
  Boxes,
  CalendarDays,
  CircleUserRound,
  ExternalLink,
  LineChart,
  MapPin,
  LogOut,
  SearchCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Info
} from "lucide-react";
import { ChatPanel } from "./components/ChatPanel";
import { AuthPage } from "./components/AuthPage";
import { ComparisonTable } from "./components/ComparisonTable";
import { clearSession, compareProducts, fetchCurrentUser, fetchSales, hasSession, storeSession, type AuthUser } from "./services/commerceApi";
import type { ComparisonResponse, SaleEvent } from "./types/commerce";

export function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState<{ title: string; message: string } | null>(null);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("India");
  const [showUnsupportedLocation, setShowUnsupportedLocation] = useState(false);
  const [response, setResponse] = useState<ComparisonResponse | null>(null);
  const [sales, setSales] = useState<SaleEvent[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const displayProduct = response?.offers[0]?.productName ?? "";
  const hasStorage = Boolean(response && displayProduct.includes(response.intent.storage));
  const hasColor = Boolean(response && displayProduct.includes(response.intent.color));
  const heroFeatures = [
    { icon: Bot, title: "Comparison chatbot", text: "Ask in natural language and get ranked store options." },
    { icon: SearchCheck, title: "Product intelligence", text: "Find brands, variants, budget matches, and sale offers." },
    { icon: LineChart, title: "Enterprise decisions", text: "Compare price, seller, delivery, rating, and offer strength." }
  ];
  const commerceHighlights = [
    "Daily sale discovery across leading marketplaces",
    "Brand recommendations when customers search by category",
    "Lowest-to-highest price ranking with seller confidence",
    "Direct handoff to Amazon, Flipkart, Croma, Myntra, and more"
  ];

  useEffect(() => {
    if (!hasSession()) {
      setAuthLoading(false);
      return;
    }
    fetchCurrentUser()
      .then(setUser)
      .catch(clearSession)
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchSales()
      .then(setSales)
      .catch(() => setSales([]))
      .finally(() => setSalesLoading(false));
  }, [user]);

  function updateQuery(value: string) {
    setQuery(value);
    setError("");
    if (!value.trim()) {
      setResponse(null);
      setLoading(false);
    }
  }

  async function runSearch() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResponse(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await compareProducts(trimmedQuery);
      setResponse(result);
    } catch (exception) {
      setResponse(null);
      const backendMessage = axios.isAxiosError(exception) && typeof exception.response?.data?.message === "string"
        ? exception.response.data.message
        : "";
      setError(backendMessage || "Backend search is unavailable. Please try again in a few seconds.");
    } finally {
      setLoading(false);
    }
  }

  function updateLocation(value: string) {
    if (value === "India" || value === "Dubai") {
      setLocation(value);
      setShowUnsupportedLocation(false);
      return;
    }
    setShowUnsupportedLocation(true);
  }

  function handleAuthenticated(nextUser: AuthUser, token: string, isNewUser: boolean) {
    storeSession(token);
    setUser(nextUser);
    const username = nextUser.email.split("@")[0];
    setWelcomeMessage(isNewUser
      ? { title: `Welcome to NiSa, ${username}!`, message: "Your account is ready. Start comparing live prices, seller offers, and smarter shopping options." }
      : { title: `Welcome back, ${username}!`, message: "Your commerce workspace is ready for your next comparison." });
  }

  function handleLogout() {
    clearSession();
    setUser(null);
    setResponse(null);
    setQuery("");
  }

  if (authLoading) return <main className="auth-page auth-loading-page"><div className="auth-loading">Loading your secure workspace...</div></main>;
  if (!user) return <AuthPage onAuthenticated={handleAuthenticated} />;

  return (
    <div className="portal">
      <>
      <header className="market-header">
        <div className="brand-block">
          <strong>NiSa</strong>
          <span>compare.in</span>
        </div>
        <label className="location-picker">
          <MapPin size={17} />
          <span>Location</span>
          <select value={location} onChange={(event) => updateLocation(event.target.value)} aria-label="Select shopping location">
            <option value="India">India</option>
            <option value="Dubai">Dubai</option>
            <option value="Other">Other country</option>
          </select>
        </label>
        <div className="top-search">
          <ChatPanel query={query} loading={loading} response={response} error={error} onQueryChange={updateQuery} onSearch={runSearch} />
        </div>
        <div className="account-summary" title={user.email}>
          <CircleUserRound size={19} />
          <span>{user.email.split("@")[0]}</span>
        </div>
        <button type="button" className="header-action" onClick={handleLogout} title="Log out">
          <LogOut size={17} /> <span>Log out</span>
        </button>
      </header>

      {showUnsupportedLocation && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowUnsupportedLocation(false)}>
          <section className="support-dialog" role="dialog" aria-modal="true" aria-labelledby="location-support-title" onMouseDown={(event) => event.stopPropagation()}>
            <strong id="location-support-title">Location not supported</strong>
            <p>NiSa currently supports India and Dubai only. Please contact admin / IT support for access in your country.</p>
            <a href="mailto:nithishganesan2001@gmail.com">nithishganesan2001@gmail.com</a>
            <button type="button" onClick={() => setShowUnsupportedLocation(false)}>Close</button>
          </section>
        </div>
      )}

      {welcomeMessage && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setWelcomeMessage(null)}>
          <section className="welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="welcome-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="welcome-dialog-mark"><ShoppingBag size={24} /></div>
            <strong id="welcome-dialog-title">{welcomeMessage.title}</strong>
            <p>{welcomeMessage.message}</p>
            <button type="button" onClick={() => setWelcomeMessage(null)}>Start exploring</button>
          </section>
        </div>
      )}

      <main className="market-main">
        <section className="sale-hero">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <p>Enterprise commerce intelligence</p>
            <h1>Comparison chatbot for smarter shopping</h1>
            <span>NiSa helps customers discover live sale windows, compare products across trusted platforms, identify the best brands by budget, and continue to the seller page with confidence.</span>
            <div className="hero-feature-row">
              {heroFeatures.map((feature) => (
                <article className="hero-feature" key={feature.title}>
                  <span><feature.icon size={22} /></span>
                  <strong>{feature.title}</strong>
                  <small>{feature.text}</small>
                </article>
              ))}
            </div>
          </motion.div>
          <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <div className="visual-orbit visual-orbit-one"><Boxes size={38} /></div>
            <div className="visual-orbit visual-orbit-two"><ShieldCheck size={34} /></div>
            <div className="visual-core">
              <Sparkles size={34} />
              <strong>AI Commerce Engine</strong>
              <span>Sale discovery + product comparison + store recommendation</span>
            </div>
            <div className="sale-badge"><BadgePercent size={26} /> Best price intelligence</div>
          </motion.div>
        </section>

        <aside className="ai-disclaimer">
          <Info size={18} />
          <span>AI-powered portal: sale dates, timings, discounts, and product availability may vary on the actual seller platform. Please confirm final details before purchase.</span>
        </aside>

        <section className="sale-grid" aria-label="Daily sale events">
          {salesLoading && <article className="sale-card loading-card">Loading daily sales...</article>}
          {!salesLoading && sales.map((sale) => (
            <a className="sale-card" href={sale.saleUrl} target="_blank" rel="noreferrer" key={`${sale.platform}-${sale.saleName}`}>
              <span className="platform-pill"><ShoppingBag size={17} /> {sale.platform}</span>
              <h2>{sale.saleName}</h2>
              <strong>{sale.productCategory}</strong>
              <span>{sale.discountText}</span>
              <small><CalendarDays size={15} /> {sale.startsOn} to {sale.endsOn}</small>
              <em>{sale.bankOffer}</em>
              <b>Open sale <ExternalLink size={15} /></b>
            </a>
          ))}
        </section>

        <section className="commerce-strip" aria-label="Commerce platform capabilities">
          {commerceHighlights.map((highlight, index) => (
            <article key={highlight}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{highlight}</strong>
            </article>
          ))}
        </section>

        {(response || error) && (
          <div className="workspace">
            <aside className="recommendation">
              <p>Recommendation</p>
              <h2>{response ? displayProduct : "Waiting for search"}</h2>
              <strong>{response?.recommendation ?? "Enter a product query to generate a live comparison and recommendation."}</strong>
              <div className="intent-list">
                <span>Brand: {response?.intent.brand === "Unknown" ? "Best brands shown below" : response?.intent.brand ?? "-"}</span>
                {hasStorage && <span>Storage: {response?.intent.storage}</span>}
                {hasColor && <span>Color: {response?.intent.color}</span>}
                <span>Query: {response?.intent.variant ?? "-"}</span>
              </div>
            </aside>
          </div>
        )}

        {response && <ComparisonTable offers={response.offers} />}
      </main>
      </>
    </div>
  );
}
