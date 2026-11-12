"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest, errorMessage } from "@/lib/api";
import { Brand, Button, Field, Notice, SelectField } from "@/components/primitives";

type Flow = "verify-email" | "resend-verification" | "forgot-password" | "reset-password" | "accept-invitation";

const flowCopy: Record<Flow, { title: string; description: string; endpoint: string; fields: { name: string; label: string; type?: string; required?: boolean }[]; success: string }> = {
  "verify-email": {
    title: "Verify your email", description: "Enter the verification token from your email to activate your account.",
    endpoint: "/auth/verify-email", fields: [{ name: "token", label: "Verification token" }],
    success: "Your email has been verified. You can now sign in.",
  },
  "resend-verification": {
    title: "Resend verification", description: "We’ll send verification instructions if an account needs them.",
    endpoint: "/auth/resend-verification", fields: [{ name: "email", label: "Email address", type: "email" }],
    success: "If the account can receive another message, verification instructions have been sent.",
  },
  "forgot-password": {
    title: "Reset your password", description: "Enter your account email and we’ll send password reset instructions if it exists.",
    endpoint: "/auth/forgot-password", fields: [{ name: "email", label: "Email address", type: "email" }],
    success: "If an account exists for that email, password reset instructions have been sent.",
  },
  "reset-password": {
    title: "Choose a new password", description: "Use the reset token from your email and choose a new password.",
    endpoint: "/auth/reset-password",
    fields: [{ name: "token", label: "Reset token" }, { name: "password", label: "New password", type: "password" }],
    success: "Your password has been updated. You can sign in with it now.",
  },
  "accept-invitation": {
    title: "Accept your invitation", description: "Enter the invitation token you received from your company.",
    endpoint: "/invitations/accept", fields: [{ name: "token", label: "Invitation token" }],
    success: "Invitation accepted. Sign in to open your company workspace.",
  },
};

export function AuthFlow({ flow, initialToken = "" }: { flow: Flow; initialToken?: string }) {
  const copy = flowCopy[flow];
  const [values, setValues] = useState<Record<string, string>>({ token: initialToken });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});
    setBusy(true);
    try {
      await apiRequest(copy.endpoint, { method: "POST", body: JSON.stringify(values) });
      setSuccess(copy.success);
      setValues((current) => Object.fromEntries(Object.keys(current).map((key) => [key, ""])));
      if (flow === "verify-email" || flow === "reset-password" || flow === "accept-invitation") {
        window.setTimeout(() => router.push("/login"), 1200);
      }
    } catch (reason) {
      setError(errorMessage(reason));
      if (reason && typeof reason === "object" && "fieldErrors" in reason) {
        const fields = (reason as { fieldErrors?: Record<string, string | string[]> }).fieldErrors || {};
        setFieldErrors(Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : value])));
      }
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page">
    <header className="auth-header"><Brand /><Link href="/login">Sign in <span aria-hidden="true">↗</span></Link></header>
    <section className="auth-card">
      <div className="auth-mark">o.</div><p className="eyebrow">ACCOUNT SUPPORT</p><h1>{copy.title}</h1><p className="auth-copy">{copy.description}</p>
      {error && <Notice kind="error">{error}</Notice>}
      {success && <Notice kind="success">{success}</Notice>}
      <form className="form-stack" onSubmit={submit}>
        {copy.fields.map((field) => <Field key={field.name} label={field.label} type={field.type || "text"} required={field.required !== false} autoComplete={field.name === "password" ? "new-password" : undefined} value={values[field.name] || ""} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} error={fieldErrors[field.name]} />)}
        <Button type="submit" disabled={busy}>{busy ? "Please wait…" : "Continue"} <span aria-hidden="true">↗</span></Button>
      </form>
      <div className="auth-divider"><span>Need another way?</span></div>
      <a className="auth-small-link" href="/resend-verification">Email verification</a><a className="auth-small-link" href="/forgot-password">Password reset</a>
    </section>
    <footer className="auth-footer"><span>Origin account support</span><span>·</span><Link href="/">Home</Link></footer>
  </main>;
}

export function ProfileSummary({ user }: { user: { firstName: string; middleName?: string | null; lastName: string; email: string } }) {
  return <div className="profile-summary"><div className="profile-avatar">{user.firstName.slice(0, 1)}{user.lastName.slice(0, 1)}</div><div><h2>{[user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ")}</h2><p>{user.email}</p><small>Account access is managed by your organization.</small></div></div>;
}

export function RoleSelect({ value, onChange, roles }: { value: string; onChange: (value: string) => void; roles: string[] }) {
  return <SelectField label="Role" value={value} onChange={(event) => onChange(event.target.value)}>{roles.map((role) => <option value={role} key={role}>{role.replaceAll("_", " ")}</option>)}</SelectField>;
}
