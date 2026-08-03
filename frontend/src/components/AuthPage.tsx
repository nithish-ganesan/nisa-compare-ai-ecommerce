import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BadgeIndianRupee, Clipboard, ExternalLink, ChartNoAxesCombined, ShoppingBag } from "lucide-react";
import { loginWithGoogle, type AuthUser } from "../services/commerceApi";

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
  const [error, setError] = useState("");
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const siteUrl = window.location.origin;
  const isIosLinkedInBrowser = /iP(hone|ad|od)/i.test(navigator.userAgent) && /LinkedInApp/i.test(navigator.userAgent);

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
        let message = "Unable to sign in with Google. Please try again.";
        if (axios.isAxiosError(exception)) {
          if (typeof exception.response?.data?.message === "string") {
            message = exception.response.data.message;
          } else if (exception.code === "ECONNABORTED") {
            message = "Google sign-in is taking too long. Please try again.";
          } else if (exception.message) {
            message = `Google sign-in failed: ${exception.message}`;
          }
        }
        setError(message);
      } finally {
        setSubmitting(false);
      }
    }

    function renderGoogleButton() {
      if (cancelled || !window.google || !googleButtonRef.current) return;
      setGoogleUnavailable(false);
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
      if (!cancelled) {
        setGoogleUnavailable(true);
        setError(
          isIosLinkedInBrowser
            ? "LinkedIn on iPhone blocked Google sign-in. Open this site in Safari or Chrome and try again."
            : "Unable to load Google sign-in. Open this site in your browser and try again."
        );
      }
    });
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("load", renderGoogleButton);
    };
  }, [googleClientId, isIosLinkedInBrowser, onAuthenticated]);

  async function copySiteLink() {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setError("Link copied. Open it in Safari or Chrome and sign in again.");
    } catch {
      setError(`Open this link in Safari or Chrome: ${siteUrl}`);
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
        <h1 id="auth-title">Welcome back</h1>
        <p className="auth-copy">Continue with a verified Gmail account to access your commerce workspace.</p>
        <div className="google-auth-block">
          {googleClientId ? (
            <div ref={googleButtonRef} className="google-auth-button" aria-label="Continue with Google" />
          ) : (
            <p className="google-auth-missing">Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in.</p>
          )}
        </div>
        {googleUnavailable && (
          <div className="browser-fallback" aria-label="Browser sign-in options">
            <a className="auth-secondary-action" href={siteUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={18} />
              <span>Open site</span>
            </a>
            <button className="auth-secondary-action" type="button" onClick={copySiteLink}>
              <Clipboard size={18} />
              <span>Copy link</span>
            </button>
          </div>
        )}
        {submitting && <p className="auth-status">Please wait...</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
