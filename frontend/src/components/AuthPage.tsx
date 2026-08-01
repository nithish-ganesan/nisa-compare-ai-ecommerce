import { FormEvent, useState } from "react";
import axios from "axios";
import { ArrowRight, LockKeyhole, Mail, UserPlus } from "lucide-react";
import { loginAccount, registerAccount, type AuthUser } from "../services/commerceApi";

type AuthPageProps = {
  onAuthenticated: (user: AuthUser, token: string) => void;
};

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isRegistering = mode === "register";

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
      onAuthenticated(result.user, result.token);
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
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand"><strong>NiSa</strong><span>compare.in</span></div>
        <p className="auth-eyebrow">Enterprise commerce intelligence</p>
        <h1 id="auth-title">{isRegistering ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-copy">{isRegistering ? "Register once to access product comparisons and sale intelligence." : "Log in to continue to your commerce workspace."}</p>
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
