"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, getCompanyMemberships, getPlatformMembership } from "@/components/auth-provider";
import { Brand, Loading, PageHeading } from "@/components/primitives";

export default function ChooseWorkspacePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const companies = getCompanyMemberships(user);
  const platform = getPlatformMembership(user);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <main className="auth-page"><Loading /></main>;
  return <main className="chooser-page">
    <header className="public-header"><Brand /><a className="text-link" href="/login">Sign out <span aria-hidden="true">↗</span></a></header>
    <section className="chooser-content"><PageHeading eyebrow="YOUR ORIGIN ACCOUNT" title="Where would you like to go?" description="Choose a workspace. Your access and role may be different in each one." />
      <div className="workspace-options">
        {platform && <Link className="workspace-option platform-option" href="/platform"><span className="workspace-icon">◈</span><span><b>Platform administration</b><small>{platform.role.replaceAll("_", " ")}</small></span><i>↗</i></Link>}
        {companies.map((membership, index) => {
          const companyId = membership.companyId || membership.company?.id;
          const companyName = membership.company?.name || membership.company?.companyName || `Company ${index + 1}`;
          return <Link className={`workspace-option ${!companyId ? "workspace-disabled" : ""}`} href={companyId ? `/workspace?company=${encodeURIComponent(companyId)}` : "#"} aria-disabled={!companyId} key={companyId || index}><span className="workspace-icon">⌂</span><span><b>{companyName}</b><small>{membership.role.replaceAll("_", " ")}</small></span><i>↗</i></Link>;
        })}
      </div>
    </section>
  </main>;
}
