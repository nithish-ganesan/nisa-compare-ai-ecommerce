import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  BadgePercent,
  Bot,
  Boxes,
  CalendarDays,
  ExternalLink,
  LineChart,
  MapPin,
  SearchCheck,
  ShieldCheck,
  ShoppingBag,
  Info,
  Sparkles,
  UserRound
} from "lucide-react";
import { ChatPanel } from "./components/ChatPanel";
import { ComparisonTable } from "./components/ComparisonTable";
import { clearAuthToken, compareProducts, fetchCurrentUser, fetchSales, loginAccount, logoutAccount, registerAccount, setAuthToken } from "./services/commerceApi";
import type { AuthResult, ComparisonResponse, SaleEvent } from "./types/commerce";

const AUTH_STORAGE_KEY = "nisa.auth.session";

export function App() {
  const [authUser, setAuthUser] = useState<AuthResult | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authLogin, setAuthLogin] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
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
    const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedSession) {
      setAuthReady(true);
      return;
    }
    try {
      const parsedSession = JSON.parse(storedSession) as AuthResult;
      if (!parsedSession.token || parsedSession.expiresAt * 1000 <= Date.now()) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        setAuthReady(true);
        return;
      }
      setAuthToken(parsedSession.token);
      setAuthUser(parsedSession);
      setAuthReady(true);
      fetchCurrentUser()
        .then((user) => setAuthUser({ ...parsedSession, username: user.username, email: user.email }))
        .catch((exception) => {
          const status = axios.isAxiosError(exception) ? exception.response?.status : undefined;
          if (status === 401 || status === 403) {
            clearAuthToken();
            window.localStorage.removeItem(AUTH_STORAGE_KEY);
            setAuthUser(null);
          }
        });
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    if (!authUser) return;
    fetchSales()
      .then(setSales)
      .catch(() => setSales([]))
      .finally(() => setSalesLoading(false));
  }, [authUser]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const result = authMode === "login"
          ? await loginAccount(authLogin, authPassword)
          : await registerAccount(authUsername, authEmail, authPassword);
      setAuthUser(result);
      setAuthToken(result.token);
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result));
      setSalesLoading(true);
    } catch (exception) {
      const fallback = authMode === "login"
          ? "No account found or password is wrong. Please register if you do not have an account."
          : "Registration failed. Please check username, email, and password.";
      setAuthError(fallback);
    } finally {
      setAuthLoading(false);
    }
  }

  async function logout() {
    try {
      await logoutAccount();
    } finally {
      clearAuthToken();
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthUser(null);
      setResponse(null);
      setSales([]);
      setQuery("");
      setAuthPassword("");
      setAuthMode("login");
    }
  }

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
    } catch {
      setResponse(null);
      setError("Backend search is unavailable. Please make sure the Spring Boot API is running on port 8080.");
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

  return (
    <div className="portal">
      {!authReady && (
        <main className="auth-shell">
          <section className="auth-brand">
            <span>NiSa compare.in</span>
            <h1>Restoring secure session</h1>
            <p>Checking your saved login and preparing the comparison portal.</p>
          </section>
        </main>
      )}

      {authReady && !authUser && (
        <main className="auth-shell">
          <section className="auth-brand">
            <span>NiSa compare.in</span>
            <h1>Secure access for enterprise commerce comparison</h1>
            <p>Create an account or login to use the AI shopping comparison chatbot, daily sale discovery, and trusted store recommendations.</p>
          </section>
          <section className="auth-card">
            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setAuthError(""); setAuthPassword(""); }}>Login</button>
              <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => { setAuthMode("register"); setAuthError(""); setAuthPassword(""); }}>Register</button>
            </div>
            <form onSubmit={submitAuth} autoComplete={authMode === "register" ? "off" : "on"}>
              {authMode === "register" && (
                <>
                  <label>
                    Username
                    <input value={authUsername} onChange={(event) => setAuthUsername(event.target.value)} placeholder="Create username" minLength={3} autoComplete="username" required />
                  </label>
                  <label>
                    Email
                    <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="name@company.com" autoComplete="email" required />
                  </label>
                </>
              )}
              {authMode === "login" && (
                <label>
                  Username or email
                  <input value={authLogin} onChange={(event) => setAuthLogin(event.target.value)} placeholder="Enter username or email" autoComplete="username" required />
                </label>
              )}
              <label>
                Password
                <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Minimum 8 characters" minLength={8} autoComplete={authMode === "register" ? "new-password" : "current-password"} required />
              </label>
              {authError && <p className="auth-error">{authError}</p>}
              <button type="submit" disabled={authLoading}>{authLoading ? "Checking..." : authMode === "login" ? "Access portal" : "Create account"}</button>
            </form>
            <small>{authMode === "login" ? "No account yet? Register with us to continue." : "Already registered? Login with username/email and password."}</small>
          </section>
        </main>
      )}

      {authReady && authUser && (
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
        <button className="header-action"><UserRound size={18} /> {authUser.username}</button>
        <button className="header-action" onClick={logout}>Logout</button>
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
      )}
    </div>
  );
}
