"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, userName } from "@/components/auth-provider";
import { Brand, Button, Loading, Notice, PageHeading, useConfirmation } from "@/components/primitives";
import { errorMessage } from "@/lib/api";

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [logoutError, setLogoutError] = useState("");
  const { confirm, dialog } = useConfirmation();
  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  if (loading || !user) return <main className="portal-wait"><Loading label="Loading account" /></main>;
  return <main className="account-page">
    <header className="public-header"><Brand /><a className="text-link" href="/choose-workspace">Return to workspace <span aria-hidden="true">↗</span></a></header>
    <section className="account-content"><PageHeading eyebrow="ACCOUNT SETTINGS" title="Your account" description="A summary of the account currently signed in to Origin." />
      <div className="account-card"><div className="profile-avatar large-avatar">{user.firstName.slice(0, 1)}{user.lastName.slice(0, 1)}</div><div><h2>{userName(user)}</h2><p>{user.email}</p><small>Sign-in and profile changes are managed through your organization.</small></div></div>
      <div className="account-actions"><div><h2>Sign out everywhere</h2><p>This ends all active Origin sessions for your account.</p></div><Button variant="danger" onClick={() => confirm({ title: "Sign out of all sessions?", description: "You’ll need to sign in again on every device. This action cannot be undone.", label: "Sign out everywhere", danger: true, action: () => { setLogoutError(""); void logout(true).catch((reason) => setLogoutError(errorMessage(reason))); } })}>Sign out all sessions</Button></div>
      {logoutError && <Notice kind="error">{logoutError}</Notice>}
      <Notice kind="info">Origin uses a secure, server-managed session cookie. Session credentials are never displayed or stored by this page.</Notice>
    </section>{dialog}
  </main>;
}
