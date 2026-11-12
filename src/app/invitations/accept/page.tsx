"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthFlow } from "@/components/auth-flow";
function AcceptPage() {
  const params = useSearchParams();
  return <AuthFlow flow="accept-invitation" initialToken={params.get("token") || ""} />;
}
export default function Page() { return <Suspense fallback={<main className="auth-page"><p>Loading…</p></main>}><AcceptPage /></Suspense>; }
