export type ApiFailure = {
  message?: string;
  error?: string;
  code?: string;
  details?: Record<string, string | string[]>;
  errors?: Record<string, string | string[]>;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string | string[]>;

  constructor(status: number, body: ApiFailure = {}) {
    const responseMessage = status >= 400 && status < 500 && ![401, 403, 404, 429].includes(status)
      ? body.message
      : undefined;
    super(responseMessage || fallbackMessage(status));
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.fieldErrors = body.details || body.errors;
  }
}

let csrfToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export function getCsrfToken() {
  return csrfToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1").replace(/\/$/, "");
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (csrfToken && method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    headers.set("X-CSRF-Token", csrfToken);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...options,
      method,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, { message: "We couldn’t reach the service. Check your connection and try again." });
  }

  const raw = await response.text();
  let body: unknown = null;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = { message: "The service returned an unexpected response." };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/me") unauthorizedHandler?.();
    const failure = body && typeof body === "object" ? (body as ApiFailure) : {};
    if (response.status === 403) {
      failure.message = "You don’t have permission to do that.";
    }
    throw new ApiError(response.status, failure);
  }

  return body as T;
}

export async function apiDownload(path: string, method: "POST" | "GET" = "POST", extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);
  if (csrfToken && method !== "GET") headers.set("X-CSRF-Token", csrfToken);
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, { message: "We couldn’t reach the service. Check your connection and try again." });
  }
  if (!response.ok) {
    if (response.status === 401) unauthorizedHandler?.();
    let failure: ApiFailure = {};
    try {
      failure = await response.json() as ApiFailure;
    } catch {
      // Binary error responses do not necessarily contain JSON.
    }
    throw new ApiError(response.status, failure);
  }
  const disposition = response.headers.get("content-disposition") || "";
  const filename = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)?.[1]?.replaceAll('"', "") || "origin-print-export";
  return { blob: await response.blob(), filename };
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session has ended. Please sign in again.";
    if (error.status === 403) return "You don’t have access to this action.";
    if (error.status === 404) return "This information is no longer available.";
    if (error.status === 429) return "Too many attempts. Please wait a moment and try again.";
    if (error.status >= 500) return "The service is temporarily unavailable. Please try again.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function fallbackMessage(status: number) {
  if (status === 401) return "Your session has ended. Please sign in again.";
  if (status === 403) return "You don’t have permission to do that.";
  if (status === 404) return "This information is no longer available.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status >= 500) return "The service is temporarily unavailable. Please try again.";
  return "The request could not be completed.";
}

export function unwrapData<T>(value: unknown): T {
  if (value && typeof value === "object" && "data" in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

export function collectionFrom(value: unknown): Record<string, unknown>[] {
  const data = unwrapData<unknown>(value);
  if (Array.isArray(data)) return data.filter(isRecord);
  if (isRecord(data)) {
    const collection = Object.values(data).find(Array.isArray);
    if (Array.isArray(collection)) return collection.filter(isRecord);
    return [data];
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
