"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, ApiError, errorMessage, setCsrfToken, setUnauthorizedHandler, unwrapData } from "@/lib/api";
import { displayFullName } from "@/lib/permissions";

export type Membership = {
  id?: string;
  companyId?: string;
  company?: { id?: string; name?: string; companyName?: string; status?: string };
  role: string;
  status?: string;
};

export type PlatformMembership = { role: string; status?: string };
export type CurrentUser = {
  id?: string;
  email: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  companyMemberships?: Membership[];
  memberships?: Membership[];
  platformMembership?: PlatformMembership | null;
  platformMember?: PlatformMembership | null;
};

type AuthContextValue = {
  user: CurrentUser | null;
  loading: boolean;
  authError: string;
  refresh: () => Promise<CurrentUser | null>;
  login: (email: string, password: string) => Promise<CurrentUser>;
  logout: (all?: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function activeMemberships(user: CurrentUser): Membership[] {
  return (user.companyMemberships || user.memberships || []).filter(
    (membership) => !membership.status || membership.status === "ACTIVE",
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await apiRequest<unknown>("/auth/me");
      const session = unwrapData<CurrentUser & { user?: CurrentUser; csrfToken?: string }>(response);
      if (session.csrfToken) setCsrfToken(session.csrfToken);
      const current = session.user || session;
      setUser(current);
      setAuthError("");
      return current;
    } catch (error) {
      setUser(null);
      setCsrfToken(null);
      if (!(error instanceof ApiError && error.status === 401)) {
        setAuthError(errorMessage(error));
        throw error;
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setCsrfToken(null);
      setAuthError("");
      setAuthError("");
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        router.replace("/login?expired=1");
      }
    });
    void refresh().catch(() => setLoading(false));
    return () => setUnauthorizedHandler(null);
  }, [refresh, router]);

  const login = useCallback(async (email: string, password: string) => {
    const result = unwrapData<{ csrfToken: string; user?: CurrentUser }>(
      await apiRequest<unknown>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    );
    if (result.csrfToken) setCsrfToken(result.csrfToken);
    const current = result.user || (await refresh());
    if (!current) throw new Error("The signed-in account could not be loaded.");
    setUser(current);
    setAuthError("");
    return current;
  }, [refresh]);

  const logout = useCallback(async (all = false) => {
    await apiRequest(all ? "/auth/logout-all" : "/auth/logout", { method: "POST" });
    setUser(null);
    setCsrfToken(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(() => ({ user, loading, authError, refresh, login, logout }), [user, loading, authError, refresh, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function userName(user: CurrentUser) {
  return displayFullName(user);
}

export function getCompanyMemberships(user: CurrentUser | null) {
  return user ? activeMemberships(user) : [];
}

export function getPlatformMembership(user: CurrentUser | null) {
  const membership = user?.platformMembership || user?.platformMember;
  return membership && (!membership.status || membership.status === "ACTIVE") ? membership : null;
}
