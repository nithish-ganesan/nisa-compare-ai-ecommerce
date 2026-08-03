import { FormEvent, useEffect, useRef, useState } from "react";
import axios from "axios";
import { ArrowRight, BadgeIndianRupee, ChartNoAxesCombined, LockKeyhole, Mail, ShoppingBag, UserPlus } from "lucide-react";
import { loginAccount, loginWithGoogle, registerAccount, type AuthUser } from "../services/commerceApi";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string | number | boolean>) => void;
        };
      };
    };
  }
}

type AuthPageProps = {
  onAuthenticated: (user: AuthUser, token: string, isNewUser: boolean) => void;
};

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const isRegistering = mode === "register";

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    let cancelled = false;
    const clientId = googleClientId;
    async function handleGoogleCredential(idToken: string) {
      setSubmitting(true);
      setError("");
      try {
        const result = await loginWithGoogle(idToken);
        onAuthenticated(result.user, result.token, Boolean(result.isNewUser));
      } catch (exception) {
        const message = axios.isAxiosError(exception) && typeof exception.response?.data?.message === "string"
          ? exception.response.data.message
          : "Unable to sign in with Google. Please try again.";
        setError(message);
      } finally {
        setSubmitting(false);
      }
    }

    function renderGoogleButton() {
      if (cancelled || !window.google || !googleButtonRef.current) return;
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) void handleGoogleCredential(response.credential);
          else setError("Google did not return a sign-in token. Please try again.");
        }
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: 360
      });
    }

    if (window.google) {
      renderGoogleButton();
      return () => { cancelled = true; };
    }

    const existingScript = document.querySelector<HTMLScriptElement>("script[src='https://accounts.google.com/gsi/client']");
    if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton, { once: true });
      return () => {
        cancelled = true;
        existingScript.removeEventListener("load", renderGoogleButton);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderGoogleButton, { once: true });
    script.addEventListener("error", () => {
      if (!cancelled) setError("Unable to load Google sign-in. Please check your connection and try again.");
    });
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("load", renderGoogleButton);
    };
  }, [googleClientId, onAuthenticated]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (isRegistering && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const result = isRegistering
        ? await registerAccount(email, password)
        : await loginAccount(email, password);
      onAuthenticated(result.user, result.token, isRegistering);
    } catch (exception) {
      const message = axios.isAxiosError(exception) && typeof exception.response?.data?.message === "string"
        ? exception.response.data.message
        : "Unable to reach the login service. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-welcome" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <p>NiSa Commerce Intelligence</p>
          <h2 id="welcome-title">Compare. Decide. Save.</h2>
          <span>Compare live prices, seller offers, delivery signals, and value with confidence.</span>
        </div>
        <div className="commerce-visual" aria-hidden="true">
          <div className="visual-price-tag"><BadgeIndianRupee size={25} /></div>
          <div className="visual-package"><ShoppingBag size={54} /></div>
          <div className="visual-chart"><ChartNoAxesCombined size={22} /><i /><i /><i /></div>
          <div className="visual-orbit-line one" />
          <div className="visual-orbit-line two" />
          <div className="visual-value-chip">Best value</div>
        </div>
      </section>
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand"><strong>NiSa</strong><span>compare.in</span></div>
        <p className="auth-eyebrow">Enterprise commerce intelligence</p>
        <h1 id="auth-title">{isRegistering ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-copy">{isRegistering ? "Register once to access product comparisons and sale intelligence." : "Log in to continue to your commerce workspace."}</p>
        <div className="google-auth-block">
          {googleClientId ? (
            <div ref={googleButtonRef} className="google-auth-button" aria-label="Continue with Google" />
          ) : (
            <p className="google-auth-missing">Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in.</p>
          )}
        </div>
        <div className="auth-divider"><span>or use email</span></div>
        <div className="auth-tabs" role="tablist" aria-label="Account access">
          <button type="button" className={!isRegistering ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Log in</button>
          <button type="button" className={isRegistering ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Register</button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label><span>Email address</span><div><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></label>
          <label><span>Password</span><div><LockKeyhole size={17} /><input type="password" autoComplete={isRegistering ? "new-password" : "current-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div></label>
          {isRegistering && <label><span>Confirm password</span><div><LockKeyhole size={17} /><input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div></label>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={submitting}>
            {isRegistering ? <UserPlus size={18} /> : <ArrowRight size={18} />}
            {submitting ? "Please wait" : isRegistering ? "Create account" : "Log in"}
          </button>
        </form>
      </section>
    </main>
  );
}
