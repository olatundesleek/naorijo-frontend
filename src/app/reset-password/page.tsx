"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthFlow } from "@/components/auth-flow";
function ResetPage() {
  const params = useSearchParams();
  return <AuthFlow flow="reset-password" initialToken={params.get("token") || ""} />;
}
export default function Page() { return <Suspense fallback={<main className="auth-page"><p>Loading…</p></main>}><ResetPage /></Suspense>; }
