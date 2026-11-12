"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/primitives";

export function VerifyEntry() {
  const [token, setToken] = useState("");
  const router = useRouter();
  function submit(event: FormEvent) {
    event.preventDefault();
    const clean = token.trim();
    if (clean) router.push(`/verify/${encodeURIComponent(clean)}`);
  }
  return <main className="verify-page">
    <header className="public-header"><Brand /><Link className="text-link" href="/">Back to Origin <span aria-hidden="true">↗</span></Link></header>
    <section className="verify-card">
      <div className="verify-icon">⌗</div><p className="eyebrow">A QUICK CHECK, A CLEAR ANSWER</p>
      <h1>Verify a product</h1><p>Open the verification link or QR code on your product to check its status. The product’s public verification link contains the token needed to open the correct page.</p>
      <form className="verify-form" onSubmit={submit}>
        <label className="field"><span>Product verification token</span><input aria-label="Product verification token" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" required placeholder="Enter the token from your product link" /></label>
        <button className="button button-primary" type="submit">Continue <span aria-hidden="true">↗</span></button>
      </form>
      <p className="verify-footnote">The result reflects the information available to Origin and does not replace a company’s quality or safety checks.</p>
    </section>
  </main>;
}
