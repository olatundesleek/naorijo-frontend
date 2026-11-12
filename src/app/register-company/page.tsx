"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Brand, Button, Field, Notice } from "@/components/primitives";
import { ApiError, apiRequest, errorMessage } from "@/lib/api";
import { companyRegistrationPayload } from "@/lib/company-registration";

export default function RegisterCompanyPage() {
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldError("");
    setSuccess(false);
    setBusy(true);
    try {
      await apiRequest("/auth/register-company", {
        method: "POST",
        body: JSON.stringify(companyRegistrationPayload(companyName)),
      });
      setSuccess(true);
      setCompanyName("");
    } catch (reason) {
      setError(errorMessage(reason));
      if (reason instanceof ApiError) {
        const value = reason.fieldErrors?.companyName;
        if (value) setFieldError(Array.isArray(value) ? value.join(", ") : value);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-header">
        <Brand />
        <Link href="/">Back to Origin <span aria-hidden="true">↗</span></Link>
      </header>
      <section className="auth-card">
        <div className="auth-mark">o.</div>
        <p className="eyebrow">FOR PRODUCT COMPANIES</p>
        <h1>Register your company</h1>
        <p className="auth-copy">Start a company workspace on Origin. This form registers a company only; it does not create a user account.</p>
        {error && <Notice kind="error">{error}</Notice>}
        {success && <Notice kind="success">Company registration received. No user account was created. Contact your platform administrator for help with next steps.</Notice>}
        <form className="form-stack" onSubmit={submit}>
          <Field
            label="Company name"
            autoComplete="organization"
            required
            minLength={2}
            maxLength={160}
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            error={fieldError}
          />
          <Button type="submit" disabled={busy || !companyName.trim()}>
            {busy ? "Submitting…" : "Register company"} <span aria-hidden="true">↗</span>
          </Button>
        </form>
        <p className="auth-footnote">Registering a company does not sign you in or create a personal account.</p>
        <div className="auth-divider"><span>Already have access?</span></div>
        <Link className="auth-small-link" href="/login">Sign in to Origin</Link>
      </section>
      <footer className="auth-footer"><span>Product verification for companies and customers</span></footer>
    </main>
  );
}
