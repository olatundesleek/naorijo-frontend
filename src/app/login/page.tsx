"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brand, Button, Field, Notice } from "@/components/primitives";
import { useAuth, getCompanyMemberships, getPlatformMembership } from "@/components/auth-provider";
import { errorMessage } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login, authError } = useAuth();
  const router = useRouter();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    setExpired(new URLSearchParams(window.location.search).get("expired") === "1");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      const companies = getCompanyMemberships(user);
      const platform = getPlatformMembership(user);
      if (platform && companies.length) router.replace("/choose-workspace");
      else if (platform) router.replace("/platform");
      else if (companies.length) router.replace("/workspace");
      else setError("This account doesn’t have an active workspace yet. Contact your organization’s administrator.");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page">
    <header className="auth-header"><Brand /><Link href="/">Back to Origin <span aria-hidden="true">↗</span></Link></header>
    <section className="auth-card">
      <div className="auth-mark">o.</div>
      <p className="eyebrow">WELCOME BACK</p><h1>Sign in to Origin</h1>
      <p className="auth-copy">Your products, your team, and the details that build trust.</p>
      {expired && <Notice kind="warning">Your session ended. Sign in again to continue.</Notice>}
      {authError && <Notice kind="error">{authError}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      <form onSubmit={submit} className="form-stack">
        <Field label="Email address" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <div className="auth-inline-link"><a href="/forgot-password">Forgot password?</a></div>
        <Button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"} <span aria-hidden="true">↗</span></Button>
      </form>
      <div className="auth-divider"><span>Need help with access?</span></div>
      <p className="auth-footnote">Public user registration is not available. Ask your company administrator for an invitation or register a company below.</p>
      <Link className="auth-small-link" href="/register-company">Register a company without creating a user account</Link>
      <a className="auth-small-link" href="/resend-verification">Resend email verification</a>
    </section>
    <footer className="auth-footer"><span>Secure sign-in</span><span>·</span><Link href="/verify">Verify a product</Link></footer>
  </main>;
}
