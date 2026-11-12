import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, setCsrfToken, setUnauthorizedHandler } from "./api";
import { companyRegistrationPayload } from "./company-registration";

afterEach(() => {
  vi.restoreAllMocks();
  setCsrfToken(null);
  setUnauthorizedHandler(null);
});

describe("session-aware API requests", () => {
  it("uses credentialed requests and sends the in-memory CSRF token on mutations", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    setCsrfToken("csrf-in-memory");

    await apiRequest("/companies/c1/members", { method: "POST", body: JSON.stringify({ email: "person@example.com" }) });

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/companies/c1/members", expect.objectContaining({
      credentials: "include",
      method: "POST",
    }));
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(request.headers).get("X-CSRF-Token")).toBe("csrf-in-memory");
  });

  it("clears the session through the unauthorized handler on a protected 401 response", async () => {
    const onUnauthorized = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "expired" }), { status: 401 })));
    setUnauthorizedHandler(onUnauthorized);

    await expect(apiRequest("/companies/c1")).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("keeps unauthenticated auth/me requests on public pages", async () => {
    const onUnauthorized = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "not signed in" }), { status: 401 })));
    setUnauthorizedHandler(onUnauthorized);

    await expect(apiRequest("/auth/me")).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("submits public company registration without creating a user", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await apiRequest("/auth/register-company", {
      method: "POST",
      body: JSON.stringify(companyRegistrationPayload("Northwind")),
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/register-company", expect.objectContaining({
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ companyName: "Northwind" }),
    }));
  });
});
