"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest, errorMessage, unwrapData } from "@/lib/api";
import { Brand, Button, Field, Loading, Notice } from "@/components/primitives";

type VerificationResult = Record<string, unknown> & { status?: string; message?: string; result?: string };

function statusPresentation(result: VerificationResult) {
  const status = String(result.status || result.result || "").toLowerCase();
  if (["valid", "verified", "authentic", "genuine"].includes(status)) return { kind: "success" as const, title: "Verification complete", text: "The service reports this code as valid. Review the details below for the result provided." };
  if (["invalid", "blocked", "recalled", "revoked", "expired"].includes(status)) return { kind: "error" as const, title: status.charAt(0).toUpperCase() + status.slice(1), text: "This code does not currently have a valid verification status. Contact the product company if you need more information." };
  if (["warning", "repeated", "duplicate"].includes(status)) return { kind: "warning" as const, title: "Please review this result", text: "The code has a warning. This result alone cannot confirm product authenticity." };
  return { kind: "info" as const, title: "Result received", text: "Review the status supplied by the product company. If it is unclear, contact them directly." };
}

export function VerificationForm({ publicToken }: { publicToken: string }) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<unknown>(`/verify/${encodeURIComponent(publicToken)}`)
      .then((response) => { if (active) { const data = unwrapData<VerificationResult>(response); setResult(data); } })
      .catch((reason) => { if (active) setError(errorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [publicToken]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    setBusy(true);
    const submitted = code;
    setCode("");
    try {
      const response = await apiRequest<unknown>(`/verify/${encodeURIComponent(publicToken)}`, {
        method: "POST",
        body: JSON.stringify({ code: submitted }),
      });
      setResult(unwrapData<VerificationResult>(response));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return <main className="verify-page">
    <header className="public-header"><Brand /><Link className="text-link" href="/">Back to Origin <span aria-hidden="true">↗</span></Link></header>
    <section className="verify-card">
      <div className="verify-icon">⌗</div><p className="eyebrow">A QUICK CHECK, A CLEAR ANSWER</p><h1>Verify a product</h1>
      <p>Enter the code printed with your product. It is sent securely for this check only and is not stored in this browser.</p>
      {loading ? <Loading label="Preparing verification" /> : error && <Notice kind="warning">{error} You can still try submitting a code if the page is available.</Notice>}
      {result && (() => { const presentation = statusPresentation(result); return <div className={`result-panel result-${presentation.kind}`}><span className="result-symbol">{presentation.kind === "success" ? "✓" : "!"}</span><div><p className="eyebrow">VERIFICATION RESULT</p><h2>{presentation.title}</h2><p>{typeof result.message === "string" ? result.message : presentation.text}</p><dl>{Object.entries(result).filter(([key, value]) => !["message", "code", "token", "id", "itemId", "publicToken"].includes(key) && ["status", "checkedAt", "productName", "batchName", "warning"].includes(key) && ["string", "number", "boolean"].includes(typeof value)).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{String(value)}</dd></div>)}</dl></div></div>; })()}
      <form onSubmit={submit} className="verify-form">
        <Field label="Verification code" autoComplete="off" autoCapitalize="characters" spellCheck={false} required value={code} onChange={(event) => setCode(event.target.value)} hint="The code is cleared from the field as soon as you submit." />
        <Button type="submit" disabled={busy || loading}>{busy ? "Checking…" : "Check code"} <span aria-hidden="true">↗</span></Button>
      </form>
      <p className="verify-footnote">A result is based on information provided by the product company. It is not a substitute for independent quality or safety checks.</p>
    </section>
  </main>;
}
