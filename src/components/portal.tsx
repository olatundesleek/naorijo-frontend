"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, apiDownload, apiRequest, collectionFrom, errorMessage, unwrapData } from "@/lib/api";
import {
  getCompanyMemberships, getPlatformMembership, useAuth, userName, type Membership,
} from "@/components/auth-provider";
import {
  Brand, Button, EmptyState, Field, Loading, Notice, PageHeading, SelectField, formatValue,
  useConfirmation, useModalFocus,
} from "@/components/primitives";
import {
  assignablePlatformRoles, canAccessCompanySection, canAccessPlatformSection,
  companyActions,
} from "@/lib/permissions";
import { createUserPayload } from "@/lib/payloads";

type Mode = "company" | "platform";
type FieldSpec = { name: string; label: string; type?: string; options?: string[]; required?: boolean; hint?: string };
type ActionSpec = {
  id: string;
  label: string;
  method: "POST" | "PATCH";
  path: string;
  fields?: FieldSpec[];
  payload?: (values: Record<string, string>) => Record<string, unknown>;
  success: string;
  danger?: boolean;
  confirm?: { title: string; description: string; label?: string };
  download?: boolean;
  idempotency?: boolean;
  contextual?: boolean;
};
type ActionOutcome = { ok: boolean; message?: string; fieldErrors?: Record<string, string | string[]> };
type SectionSpec = {
  title: string;
  description: string;
  path: (companyId: string, context: ContextIds) => string | null;
  actions?: (companyId: string, context: ContextIds, selected: Record<string, unknown> | null, role: string) => ActionSpec[];
  sensitive?: boolean;
};
type ContextIds = { productId: string; batchId: string; page: number };

const companyNav = [
  ["overview", "Overview"], ["products", "Products"], ["batches", "Batches"], ["items", "Batch items"],
  ["members", "Members"], ["invitations", "Invitations"], ["exports", "Print exports"],
  ["company-policy", "Company policy"], ["product-policy", "Product policy"], ["billing", "Billing"],
];
const platformNav = [
  ["overview", "Overview"], ["members", "Platform members"], ["companies", "Companies"],
  ["audit-logs", "Audit logs"], ["plans", "Plans"], ["onboard", "Register a company"],
];

const roleOptions = ["ADMIN", "PRODUCT_MANAGER", "EDITOR"];
const productFields: FieldSpec[] = [
  { name: "name", label: "Product name", required: true },
  { name: "sku", label: "SKU" },
  { name: "description", label: "Description", type: "textarea" },
];
const batchFields: FieldSpec[] = [
  { name: "name", label: "Batch name", required: true },
  { name: "batchNumber", label: "Batch number", required: true },
  { name: "quantity", label: "Planned quantity", type: "number", required: true },
];
const jsonField: FieldSpec[] = [
  { name: "body", label: "Request body (JSON)", type: "textarea", required: true, hint: "Use the fields supported by your API. The request is sent as written." },
];

function companySection(section: string, role: string): SectionSpec {
  const permissions = companyActions(role);
  const base = (id: string) => `/companies/${encodeURIComponent(id)}`;
  const specs: Record<string, SectionSpec> = {
    overview: {
      title: "Company overview", description: "Your company workspace and account details.",
      path: (id) => base(id),
      actions: (id, _context, _selected, role) => role === "ADMIN" ? [{
        id: "edit-company", label: "Update company profile", method: "PATCH", path: base(id),
        fields: [{ name: "companyName", label: "Company name", required: true }],
        success: "Company profile updated.",
      }] : [],
    },
    members: {
      title: "Company members", description: "Manage people and their access to this company.",
      path: (id) => `${base(id)}/members`,
      actions: (id, _ctx, selected) => [
        {
          id: "create-member", label: "Create member", method: "POST", path: `${base(id)}/members`,
          fields: [
            { name: "email", label: "Email address", type: "email", required: true },
            { name: "password", label: "Temporary password", type: "password", required: true },
            { name: "firstName", label: "First name", required: true },
            { name: "middleName", label: "Middle name" },
            { name: "lastName", label: "Last name", required: true },
            { name: "role", label: "Company role", type: "select", options: roleOptions, required: true },
          ],
          payload: (values) => createUserPayload(values),
          success: "Company member created. They must verify their email before signing in.",
        },
        ...(selected?.id ? [
          { id: "change-role", label: "Change member role", method: "PATCH" as const, path: `${base(id)}/members/${encodeURIComponent(String(selected.id))}`, fields: [{ name: "role", label: "Company role", type: "select", options: roleOptions, required: true }], success: "Member role updated.", danger: true, contextual: true, confirm: { title: "Change this member’s role?", description: "Their access to company information and actions will change immediately.", label: "Change role" } },
          { id: "suspend-member", label: "Suspend member", method: "POST" as const, path: `${base(id)}/members/${encodeURIComponent(String(selected.id))}/suspend`, success: "Member suspended.", danger: true, contextual: true, confirm: { title: "Suspend this member?", description: "They will no longer be able to use this company workspace.", label: "Suspend member" } },
          { id: "reactivate-member", label: "Reactivate member", method: "POST" as const, path: `${base(id)}/members/${encodeURIComponent(String(selected.id))}/reactivate`, success: "Member reactivated.", contextual: true, confirm: { title: "Reactivate this member?", description: "They will regain access based on their company role.", label: "Reactivate member" } },
        ] : []),
      ],
    },
    invitations: {
      title: "Invitations", description: "Invite a person by email. An invitation becomes membership only after they accept it.",
      path: (id) => `${base(id)}/invitations`,
      actions: (id) => [{
        id: "invite", label: "Invite a member", method: "POST", path: `${base(id)}/invitations`,
        fields: [{ name: "email", label: "Email address", type: "email", required: true }, { name: "role", label: "Company role", type: "select", options: roleOptions, required: true }],
        success: "Invitation sent.",
      }],
    },
    products: {
      title: "Products", description: "The products and product details managed by your company.",
      path: (id) => `${base(id)}/products`,
      actions: (id, _ctx, selected, role) => [
        ...(["ADMIN", "PRODUCT_MANAGER"].includes(role) ? [{ id: "create-product", label: "Add product", method: "POST" as const, path: `${base(id)}/products`, fields: productFields, success: "Product created." }] : []),
        ...(selected?.id ? [
          { id: "update-product", label: "Update product", method: "PATCH" as const, path: `${base(id)}/products/${encodeURIComponent(String(selected.id))}`, fields: productFields, success: "Product updated.", contextual: true },
          { id: "archive-product", label: "Archive product", method: "POST" as const, path: `${base(id)}/products/${encodeURIComponent(String(selected.id))}/archive`, success: "Product archived.", danger: true, contextual: true, confirm: { title: "Archive this product?", description: "The product will no longer be available for active management.", label: "Archive product" } },
        ] : []),
      ],
    },
    batches: {
      title: "Batches", description: "Select a product to view and manage its batches.",
      path: (_id, context) => context.productId ? `${base(_id)}/products/${encodeURIComponent(context.productId)}/batches` : null,
      actions: (id, context, selected, role) => [
        ...(context.productId && ["ADMIN", "PRODUCT_MANAGER"].includes(role) ? [{ id: "create-batch", label: "Create batch", method: "POST" as const, path: `${base(id)}/products/${encodeURIComponent(context.productId)}/batches`, fields: batchFields, success: "Batch created." }] : []),
        ...(selected?.id ? [{ id: "update-batch", label: "Update batch", method: "PATCH" as const, path: `${base(id)}/batches/${encodeURIComponent(String(selected.id))}`, fields: batchFields, success: "Batch updated.", contextual: true }] : []),
      ],
    },
    items: {
      title: "Batch items", description: "Review items associated with a batch. Verification codes are never displayed here.",
      path: (id, context) => context.batchId ? `${base(id)}/batches/${encodeURIComponent(context.batchId)}/items?page=${context.page}` : null,
      sensitive: true,
      actions: (id, context, selected) => [
        ...(context.batchId && permissions.generateItems ? [{
          id: "generate-items", label: "Generate items", method: "POST" as const, path: `${base(id)}/batches/${encodeURIComponent(context.batchId)}/items/generate`,
          fields: [{ name: "quantity", label: "Number of items", type: "number", required: true }],
          success: "Generation job created. Codes are not returned in this response; use Print exports to retrieve the one-time export.",
          idempotency: true,
        }] : []),
        ...(selected?.id && permissions.revokeItems ? [
          { id: "revoke-item", label: "Revoke selected item", method: "POST" as const, path: `${base(id)}/items/${encodeURIComponent(String(selected.id))}/revoke`, success: "Item revoked.", danger: true, contextual: true, confirm: { title: "Revoke this item?", description: "The code will no longer be valid for product verification.", label: "Revoke item" } },
          { id: "recall-item", label: "Recall selected item", method: "POST" as const, path: `${base(id)}/items/${encodeURIComponent(String(selected.id))}/recall`, success: "Item recalled.", danger: true, contextual: true, confirm: { title: "Recall this item?", description: "This action changes the verification status associated with the item.", label: "Recall item" } },
        ] : []),
      ],
    },
    exports: {
      title: "Print exports", description: "Export downloads are sensitive, available once, and may expire.",
      path: (id) => `${base(id)}/print-exports`,
      sensitive: true,
      actions: (id, _ctx, selected) => selected?.id ? [{
        id: "download-export", label: "Download one-time export", method: "POST", path: `${base(id)}/print-exports/${encodeURIComponent(String(selected.id))}/download`,
        success: "Export download started.", danger: true, download: true,
        contextual: true,
        confirm: { title: "Download this sensitive export?", description: "This export may only be downloaded once and can expire. Store it securely and limit access to authorized printing staff.", label: "Download export" },
      }] : [],
    },
    "company-policy": {
      title: "Company verification policy", description: "Review and update how repeated or blocked code use is handled.",
      path: (id) => `${base(id)}/verification-policy`,
      actions: (id) => [{
        id: "update-company-policy", label: "Update policy", method: "PATCH", path: `${base(id)}/verification-policy`,
        fields: jsonField, payload: parseJsonBody, success: "Company verification policy updated.",
      }],
    },
    "product-policy": {
      title: "Product verification policy", description: "Select a product to inspect or update its verification policy.",
      path: (id, context) => context.productId ? `${base(id)}/products/${encodeURIComponent(context.productId)}/verification-policy` : null,
      actions: (id, context) => context.productId ? [{
        id: "update-product-policy", label: "Update product policy", method: "PATCH", path: `${base(id)}/products/${encodeURIComponent(context.productId)}/verification-policy`,
        fields: jsonField, payload: parseJsonBody, success: "Product verification policy updated.",
      }] : [],
    },
    billing: {
      title: "Billing", description: "Review the current company subscription and manage cancellation.",
      path: (id) => `${base(id)}/billing`,
      actions: (id) => [{
        id: "cancel-subscription", label: "Cancel subscription", method: "POST", path: `${base(id)}/billing/cancel`,
        success: "Subscription cancellation requested.", danger: true,
        confirm: { title: "Cancel this subscription?", description: "This may affect access to paid features. The API will confirm the cancellation details.", label: "Cancel subscription" },
      }],
    },
  };
  return specs[section] || specs.overview;
}

function platformSection(section: string): SectionSpec {
  const base = "/platform-admin";
  const specs: Record<string, SectionSpec> = {
    overview: { title: "Platform overview", description: "Platform data and tools available to your role.", path: () => `${base}/companies` },
    members: {
      title: "Platform members", description: "Manage platform-specific accounts and roles.",
      path: () => `${base}/members`,
      actions: (_id, _ctx, _selected, currentRole) => {
        const assignable = assignablePlatformRoles(currentRole);
        return assignable.length ? [{
          id: "create-platform-member", label: "Create platform member", method: "POST", path: `${base}/members`,
          fields: [
            { name: "email", label: "Email address", type: "email", required: true },
            { name: "password", label: "Temporary password", type: "password", required: true },
            { name: "firstName", label: "First name", required: true },
            { name: "middleName", label: "Middle name" },
            { name: "lastName", label: "Last name", required: true },
            { name: "role", label: "Platform role", type: "select", options: assignable, required: true },
          ],
          payload: (values) => createUserPayload(values),
          success: "Platform member created.",
        }] : [];
      },
    },
    companies: {
      title: "Companies", description: "Review participating companies and manage their platform status.",
      path: () => `${base}/companies`,
      actions: (_id, _ctx, selected, currentRole) => selected?.id && ["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(currentRole) ? [
        { id: "suspend-company", label: "Suspend company", method: "PATCH", path: `${base}/companies/${encodeURIComponent(String(selected.id))}/status`, fields: [{ name: "status", label: "New company status", type: "select", options: ["SUSPENDED"], required: true }], success: "Company status updated.", danger: true, contextual: true, confirm: { title: "Suspend this company?", description: "This changes company availability. The API will enforce the final access decision.", label: "Suspend company" } },
        { id: "activate-company", label: "Activate company", method: "PATCH", path: `${base}/companies/${encodeURIComponent(String(selected.id))}/status`, payload: () => ({ status: "ACTIVE" }), success: "Company activated.", contextual: true, confirm: { title: "Activate this company?", description: "The company will be marked active by the platform.", label: "Activate company" } },
        { id: "assign-subscription", label: "Assign subscription", method: "POST", path: `${base}/companies/${encodeURIComponent(String(selected.id))}/subscriptions`, fields: [{ name: "planId", label: "Plan ID", required: true }, { name: "startsAt", label: "Starts at", type: "date" }, { name: "endsAt", label: "Ends at", type: "date" }], success: "Company subscription assignment submitted.", contextual: true },
      ] : [],
    },
    "audit-logs": { title: "Audit logs", description: "Traceable records of platform activity. Use the paging controls to review older entries.", path: (_id, context) => `${base}/audit-logs?page=${context.page}&limit=25` },
    plans: {
      title: "Plans", description: "Review available plans and create or update plan definitions.",
      path: () => `${base}/plans`,
      actions: (_id, _ctx, selected, currentRole) => ["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(currentRole) ? [
        { id: "create-plan", label: "Create plan", method: "POST", path: `${base}/plans`, fields: jsonField, payload: parseJsonBody, success: "Plan created." },
        ...(selected?.id ? [{ id: "update-plan", label: "Update selected plan", method: "PATCH" as const, path: `${base}/plans/${encodeURIComponent(String(selected.id))}`, fields: jsonField, payload: parseJsonBody, success: "Plan updated.", contextual: true }] : []),
      ] : [],
    },
    onboard: {
      title: "Create a company", description: "Platform-authorized onboarding creates a company and its first company Admin. That Admin is not a platform member.",
      path: () => null,
      actions: () => [{
        id: "register-company", label: "Create company and Admin", method: "POST", path: "/auth/register-company",
        fields: [
          { name: "companyName", label: "Company name", required: true },
          { name: "email", label: "Admin email address", type: "email", required: true },
          { name: "password", label: "Temporary password", type: "password", required: true },
          { name: "firstName", label: "Admin first name", required: true },
          { name: "middleName", label: "Admin middle name" },
          { name: "lastName", label: "Admin last name", required: true },
        ],
        payload: (values) => createUserPayload(values, { companyName: values.companyName.trim() }),
        success: "Company and first company Admin created. The Admin must verify their email.",
      }],
    },
  };
  return specs[section] || specs.overview;
}

function parseJsonBody(values: Record<string, string>) {
  try {
    const body = JSON.parse(values.body || "{}");
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new Error("Enter a valid JSON object for the request body.");
  }
}

function getCompanyId(membership: Membership | undefined) {
  return membership?.companyId || membership?.company?.id || "";
}

function recordId(row: Record<string, unknown>) {
  for (const key of ["id", "companyId", "productId", "batchId", "memberId", "exportJobId", "planId"]) {
    if (row[key] !== undefined && row[key] !== null) return String(row[key]);
  }
  return "";
}

function rowLabel(row: Record<string, unknown>) {
  return String(row.name || row.companyName || row.productName || row.email || row.batchNumber || row.id || "Record");
}

function safeColumns(rows: Record<string, unknown>[]) {
  const blocked = /password|secret|token|verification.?code|raw.?code|qr|hash/i;
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).filter((key) => !blocked.test(key)).slice(0, 6);
  return keys;
}

export function Portal({ mode, section: requestedSection, initialCompanyId = "", initialProductId = "", initialBatchId = "", initialPage = 1 }: { mode: Mode; section: string; initialCompanyId?: string; initialProductId?: string; initialBatchId?: string; initialPage?: number }) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const memberships = getCompanyMemberships(user);
  const platformMembership = getPlatformMembership(user);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [context, setContext] = useState<ContextIds>({ productId: initialProductId, batchId: initialBatchId, page: initialPage });
  const [data, setData] = useState<unknown>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const { confirm, dialog } = useConfirmation();

  useEffect(() => {
    setContext({ productId: initialProductId, batchId: initialBatchId, page: initialPage });
  }, [initialProductId, initialBatchId, initialPage]);

  const membership = memberships.find((entry) => getCompanyId(entry) === companyId) || memberships[0];
  const resolvedCompanyId = mode === "company" ? getCompanyId(membership) : "";
  const role = mode === "company" ? (membership?.role || "") : (platformMembership?.role || "");
  const section = requestedSection || "overview";
  const spec = useMemo(() => mode === "company" ? companySection(section, role) : platformSection(section), [mode, section, role]);
  const nav = mode === "company" ? companyNav : platformNav;
  const access = mode === "company" ? canAccessCompanySection(role, section) : canAccessPlatformSection(role, section);
  const permittedNav = nav.filter(([key]) => mode === "company" ? canAccessCompanySection(role, key) : canAccessPlatformSection(role, key));
  const endpoint = mode === "company"
    ? resolvedCompanyId ? spec.path(resolvedCompanyId, context) : null
    : spec.path("", context);
  const actions = access && endpoint !== null
    ? (spec.actions?.(resolvedCompanyId, context, selected, role) || []).filter((action) => {
      if (mode === "company") {
        if (["members", "invitations"].includes(section) && role !== "ADMIN") return false;
        if (action.id === "edit-company" && role !== "ADMIN") return false;
        if (action.id === "create-product" && role === "EDITOR") return false;
        if (action.id === "create-batch" && role === "EDITOR") return false;
        if (section === "billing" && role !== "ADMIN") return false;
        if (section === "exports" && role !== "ADMIN") return false;
        if (action.id === "generate-items" && role === "EDITOR") return false;
        if (["revoke-item", "recall-item"].includes(action.id) && role !== "ADMIN") return false;
        if (["update-company-policy", "update-product-policy"].includes(action.id) && role !== "ADMIN") return false;
      }
      if (mode === "platform" && action.id === "register-company" && role !== "SUPER_ADMIN" && role !== "PLATFORM_ADMIN") return false;
      return true;
    })
    : [];

  useEffect(() => {
    if (!loading && (!user || (mode === "company" ? memberships.length === 0 : !platformMembership))) {
      router.replace("/login");
    }
  }, [loading, user, mode, memberships.length, platformMembership, router]);

  useEffect(() => {
    if (mode === "company" && membership) {
      const id = getCompanyId(membership);
      setCompanyId(id);
    }
  }, [mode, membership]);

  const loadData = useCallback(async () => {
    setError("");
    setSelected(null);
    setSelectedDetails(null);
    if (!endpoint || !access) {
      setData(null);
      setRows([]);
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    try {
      const result = await apiRequest<unknown>(endpoint);
      setData(unwrapData(result));
      setRows(collectionFrom(result));
    } catch (reason) {
      setError(errorMessage(reason));
      setData(null);
      setRows([]);
    } finally {
      setLoadingData(false);
    }
  }, [endpoint, access]);

  useEffect(() => { void loadData(); }, [loadData]);

  const execute = useCallback(async (action: ActionSpec, values: Record<string, string> = {}): Promise<ActionOutcome> => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let payload = action.payload ? action.payload(values) : values;
      if (!action.payload) {
        payload = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ""));
        for (const field of action.fields || []) {
          if (field.type === "number" && values[field.name] !== "") payload[field.name] = Number(values[field.name]);
        }
      }
      const headers = action.idempotency ? { "Idempotency-Key": crypto.randomUUID() } : undefined;
      if (action.download) {
        const { blob, filename } = await apiDownload(action.path, "POST", headers);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        await apiRequest(action.path, { method: action.method, body: action.method === "PATCH" || action.method === "POST" ? JSON.stringify(payload) : undefined, headers });
      }
      setNotice(action.success);
      await loadData();
      return { ok: true };
    } catch (reason) {
      const message = errorMessage(reason);
      setError(message);
      return {
        ok: false,
        message,
        fieldErrors: reason instanceof ApiError ? reason.fieldErrors : undefined,
      };
    } finally {
      setBusy(false);
    }
  }, [loadData]);

  function runAction(action: ActionSpec, values?: Record<string, string>): Promise<ActionOutcome> {
    if (action.confirm) {
      confirm({
        ...action.confirm,
        danger: action.danger,
        action: () => { void execute(action, values); },
      });
      return Promise.resolve({ ok: true });
    } else {
      return execute(action, values);
    }
  }

  if (loading || !user) return <main className="portal-wait"><Loading label="Opening your workspace" /></main>;
  if (mode === "company" && !memberships.length) return <main className="portal-wait"><Notice kind="error">This account has no active company membership.</Notice></main>;
  if (mode === "platform" && !platformMembership) return <main className="portal-wait"><Notice kind="error">Platform administration is available only to active platform members.</Notice></main>;
  if (!access) return <main className="portal-wait"><PageHeading title="You don’t have access to this page" description="Your current membership does not include this area. The API remains the authority for access decisions." /><Button onClick={() => router.replace(mode === "company" ? "/workspace" : "/platform")}>Return to overview</Button></main>;

  return <div className={`portal-layout ${mode === "platform" ? "portal-platform" : ""}`}>
    <aside className={`portal-sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand"><Brand /><span className="area-pill">{mode === "platform" ? "PLATFORM" : "COMPANY"}</span><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation">×</button></div>
      {mode === "company" && memberships.length > 1 && <div className="company-select"><label htmlFor="company-switcher">WORKSPACE</label><select id="company-switcher" value={resolvedCompanyId} onChange={(event) => {
        const id = event.target.value; setCompanyId(id); setContext({ productId: "", batchId: "", page: 1 }); router.push(`/workspace?company=${encodeURIComponent(id)}`);
      }}>{memberships.map((entry, index) => {
        const id = getCompanyId(entry);
        return <option key={id || index} value={id}>{entry.company?.name || entry.company?.companyName || `Company ${index + 1}`}</option>;
      })}</select></div>}
      <p className="nav-caption">{mode === "platform" ? "PLATFORM TOOLS" : "COMPANY WORKSPACE"}</p>
      <nav className="portal-nav" aria-label={`${mode} navigation`}>
        {permittedNav.map(([key, label]) => {
          const query = new URLSearchParams();
          if (resolvedCompanyId) query.set("company", resolvedCompanyId);
          if (context.productId) query.set("product", context.productId);
          if (context.batchId) query.set("batch", context.batchId);
          if (context.page > 1) query.set("page", String(context.page));
          const destination = mode === "company"
            ? `/workspace/${key}${query.size ? `?${query}` : ""}`
            : key === "onboard" ? "/platform/companies/new" : `/platform/${key}`;
          return <Link key={key} href={destination} className={section === key ? "active" : ""} onClick={() => setMobileNav(false)}><span className="nav-glyph" aria-hidden="true">{navGlyph(key)}</span>{label}{section === key && <i />}</Link>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-user"><span className="user-avatar">{user.firstName.slice(0, 1)}{user.lastName.slice(0, 1)}</span><span><b>{userName(user)}</b><small>{role.replaceAll("_", " ")}</small></span></div>
        <Link className="sidebar-link" href="/account">Account settings <span>↗</span></Link>
        {mode === "company" && platformMembership && <Link className="sidebar-link" href="/platform">Platform administration <span>↗</span></Link>}
        {memberships.length > 0 && mode === "platform" && <Link className="sidebar-link" href="/workspace">Company workspace <span>↗</span></Link>}
        <button className="sidebar-link logout-link" onClick={() => {
          setLogoutError("");
          void logout(false).catch((reason) => setLogoutError(errorMessage(reason)));
        }}>Sign out <span>↗</span></button>
      </div>
    </aside>
    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="portal-main">
      <header className="portal-topbar">
        <button className="menu-toggle" onClick={() => setMobileNav(true)} aria-label="Open navigation">☰</button>
        <div className="breadcrumbs"><Link href={mode === "company" ? "/workspace" : "/platform"}>{mode === "company" ? "Company" : "Platform"}</Link><span>/</span><b>{spec.title}</b></div>
        <div className="topbar-right"><span className="online-indicator"><i /> Connected account</span><Link className="topbar-avatar" href="/account" aria-label="Account settings">{user.firstName.slice(0, 1)}{user.lastName.slice(0, 1)}</Link></div>
      </header>
      <div className="portal-content">
        <PageHeading eyebrow={mode === "platform" ? `PLATFORM · ${role.replaceAll("_", " ")}` : `${membership?.company?.name || membership?.company?.companyName || "COMPANY"} · ${role.replaceAll("_", " ")}`} title={spec.title} description={spec.description}
          action={<>
            {mode === "platform" && section === "companies" && ["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(role) && <Link className="button button-secondary" href="/platform/companies/new">Register a company <span aria-hidden="true">↗</span></Link>}
            {actions.some((action) => !action.contextual) && <ActionMenu actions={actions.filter((action) => !action.contextual)} onRun={runAction} busy={busy} />}
          </>}
        />
        {mode === "company" && !resolvedCompanyId && <Notice kind="error">Your active membership did not include a company identifier. Contact your platform administrator; no company API request was sent.</Notice>}
        {mode === "company" && ["batches", "items", "product-policy"].includes(section) && <div className="context-bar">
          {section !== "product-policy" && <Field label="Product ID" value={context.productId} onChange={(event) => setContext((old) => ({ ...old, productId: event.target.value, batchId: "" }))} placeholder="Select a product from the Products page or enter its ID" />}
          {section === "items" && <Field label="Batch ID" value={context.batchId} onChange={(event) => setContext((old) => ({ ...old, batchId: event.target.value }))} placeholder="Select a batch from Batches or enter its ID" />}
          {section === "product-policy" && <Field label="Product ID" value={context.productId} onChange={(event) => setContext((old) => ({ ...old, productId: event.target.value }))} placeholder="Select a product from the Products page or enter its ID" />}
          {section === "items" && <Button variant="secondary" onClick={() => setContext((old) => ({ ...old, page: Math.max(1, old.page - 1) }))}>Previous</Button>}
          {section === "items" && <span className="page-number">Page {context.page}</span>}
          {section === "items" && <Button variant="secondary" onClick={() => setContext((old) => ({ ...old, page: old.page + 1 }))}>Next</Button>}
        </div>}
        {notice && <Notice kind="success">{notice}</Notice>}
        {error && <Notice kind="error">{error}</Notice>}
        {logoutError && <Notice kind="error">{logoutError}</Notice>}
        {section === "overview" && mode === "company" && <OverviewCards rows={rows} data={data} />}
        {section === "overview" && mode === "platform" && <OverviewCards rows={rows} data={data} platform />}
        {section === "onboard" && mode === "platform" && role !== "SUPER_ADMIN" && role !== "PLATFORM_ADMIN" && <Notice kind="warning">Company onboarding requires companies:manage permission.</Notice>}
        {section === "onboard" && mode === "platform" && (role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN") && <OnboardGuide />}
        {loadingData ? <Loading label="Loading records" /> : endpoint === null ? <EmptyState title={mode === "company" ? "Choose a resource" : "No dashboard data available"}>{mode === "company" ? "Select a product or batch above to load its records." : "The API does not provide a separate platform metrics endpoint. Use the platform navigation to review available records."}</EmptyState> : rows.length ? <DataTable rows={rows} section={section} selected={selected} onSelect={(row) => {
          setSelected(row);
          const id = recordId(row);
          if (section === "products") setContext((old) => ({ ...old, productId: id }));
          if (section === "batches") setContext((old) => ({ ...old, batchId: id }));
          if (mode === "company" && id && ["products", "batches"].includes(section)) {
            const detailPath = section === "products"
              ? `/companies/${encodeURIComponent(resolvedCompanyId)}/products/${encodeURIComponent(id)}`
              : `/companies/${encodeURIComponent(resolvedCompanyId)}/batches/${encodeURIComponent(id)}`;
            void apiRequest<unknown>(detailPath).then((response) => setSelectedDetails(unwrapData(response))).catch((reason) => setError(errorMessage(reason)));
          } else {
            setSelectedDetails(row);
          }
        }} /> : data ? <RecordSummary data={data} /> : <EmptyState title="Nothing here yet">{emptyCopy(section)}</EmptyState>}
        {selectedDetails !== null && <div className="selected-details"><p className="eyebrow">RECORD DETAILS</p><RecordSummary data={selectedDetails} /></div>}
        {selected && <div className="selected-record"><div><p className="eyebrow">SELECTED RECORD</p><h2>{rowLabel(selected)}</h2><p>{recordId(selected) ? `ID ${recordId(selected)}` : "Selected record"}</p></div><div className="record-actions">
          {actions.filter((action) => action.contextual).map((action) => <ActionButton key={action.id} action={action} onRun={runAction} busy={busy} />)}
        </div></div>}
        {section === "account" && <p>Account details appear in the Account settings page.</p>}
      </div>
    </main>
    {dialog}
  </div>;
}

function navGlyph(key: string) {
  const glyphs: Record<string, string> = { overview: "⌂", products: "▤", batches: "▦", items: "⌗", members: "◎", invitations: "✉", exports: "⇩", "company-policy": "◈", "product-policy": "◇", billing: "◌", companies: "⌂", "audit-logs": "≋", plans: "▱", onboard: "+" };
  return glyphs[key] || "·";
}

function emptyCopy(section: string) {
  const messages: Record<string, string> = {
    overview: "The API returned no overview records yet.",
    members: "There are no members to show. Create a member or send an invitation if you have permission.",
    invitations: "No active invitations are listed.",
    products: "Add your first product to start organizing batches.",
    batches: "Select a product above, then create its first batch.",
    items: "Select a batch to review generated items.",
    exports: "Print export jobs will appear here after item generation.",
    companies: "No companies are available to your platform role.",
    plans: "No plans are available yet.",
    "audit-logs": "No audit entries were returned for this page.",
  };
  return messages[section] || "No records are available right now.";
}

function OverviewCards({ rows, data, platform = false }: { rows: Record<string, unknown>[]; data: unknown; platform?: boolean }) {
  const values = rows[0] || (data && typeof data === "object" ? data as Record<string, unknown> : {});
  const entries = Object.entries(values).filter(([key, value]) => !/password|secret|token|code|hash/i.test(key) && ["string", "number", "boolean"].includes(typeof value)).slice(0, 4);
  return <div className="overview-cards">
    {(entries.length ? entries : [
      ["Access", platform ? "Platform member" : "Company member"],
      ["Workspace", platform ? "Platform administration" : "Company operations"],
    ] as [string, unknown][]).map(([label, value], index) => <article key={String(label)} className="overview-card"><span className={`overview-card-icon card-icon-${index}`}>{["◈", "⌂", "✓", "↗"][index % 4]}</span><small>{String(label).replace(/([A-Z])/g, " $1")}</small><strong>{formatValue(value)}</strong><i>Available from Origin</i></article>)}
    {!platform && <article className="overview-card overview-hint"><span className="overview-card-icon">⌗</span><small>PUBLIC VERIFICATION</small><strong>One code, one clear answer</strong><i>Customers can verify without signing in.</i></article>}
  </div>;
}

function OnboardGuide() {
  return <Notice kind="info">This form creates a company and its first company Admin through the platform-authorized onboarding endpoint. Email verification is required. The API enforces companies:manage.</Notice>;
}

function DataTable({ rows, section, selected, onSelect }: { rows: Record<string, unknown>[]; section: string; selected: Record<string, unknown> | null; onSelect: (row: Record<string, unknown>) => void }) {
  const columns = safeColumns(rows);
  const selectable = ["members", "products", "batches", "items", "exports", "companies", "plans"].includes(section);
  if (!columns.length) return <EmptyState title="Records are available">The API returned records, but there are no safe display fields to show.</EmptyState>;
  return <div className="table-wrap"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column}>{column.replace(/([A-Z])/g, " $1")}</th>)}{selectable && <th><span className="sr-only">Actions</span></th>}</tr></thead><tbody>
    {rows.map((row, index) => <tr key={recordId(row) || index} className={selected === row ? "row-selected" : ""}>
      {columns.map((column) => <td key={column}>{formatValue(row[column])}</td>)}
      {selectable && <td><button className="table-select" onClick={() => onSelect(row)} aria-label={`Select ${rowLabel(row)}`}>Select <span>↗</span></button></td>}
    </tr>)}
  </tbody></table></div>;
}

function RecordSummary({ data }: { data: unknown }) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const entries = Object.entries(data as Record<string, unknown>).filter(([key]) => !/password|secret|token|code|hash/i.test(key));
  if (!entries.length) return null;
  return <div className="record-summary">{entries.map(([key, value]) => <div key={key}><small>{key.replace(/([A-Z])/g, " $1")}</small><b>{formatValue(value)}</b></div>)}</div>;
}

function ActionMenu({ actions, onRun, busy }: { actions: ActionSpec[]; onRun: (action: ActionSpec, values?: Record<string, string>) => Promise<ActionOutcome>; busy: boolean }) {
  const [active, setActive] = useState<ActionSpec | null>(null);
  return <>
    {actions.map((action) => <Button key={action.id} onClick={() => setActive(action)} disabled={busy}>{action.label}</Button>)}
    {active && <ActionModal action={active} onClose={() => setActive(null)} onSubmit={(values) => onRun(active, values)} busy={busy} />}
  </>;
}

function ActionButton({ action, onRun, busy }: { action: ActionSpec; onRun: (action: ActionSpec, values?: Record<string, string>) => Promise<ActionOutcome>; busy: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant={action.danger ? "danger" : "secondary"} onClick={() => action.fields ? setOpen(true) : onRun(action)} disabled={busy}>{action.label}</Button>
    {open && <ActionModal action={action} onClose={() => setOpen(false)} onSubmit={(values) => onRun(action, values)} busy={busy} />}
  </>;
}

function ActionModal({ action, onClose, onSubmit, busy }: { action: ActionSpec; onClose: () => void; onSubmit: (values: Record<string, string>) => Promise<ActionOutcome>; busy: boolean }) {
  const dialogRef = useModalFocus(onClose);
  const [values, setValues] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | string[]>>({});
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (action.payload === parseJsonBody) parseJsonBody(values);
      setFieldErrors({});
      setLocalError("");
      const outcome = await onSubmit(values);
      if (outcome.fieldErrors) setFieldErrors(outcome.fieldErrors);
      if (!outcome.ok) {
        setLocalError(outcome.message || "Check the highlighted fields and try again.");
        return;
      }
      onClose();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Check the form and try again.");
    }
  }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="dialog action-dialog" role="dialog" aria-modal="true" aria-labelledby={`action-${action.id}`} tabIndex={-1}>
      <button className="dialog-close" onClick={onClose} aria-label="Close form">×</button><p className="eyebrow">ORIGIN WORKSPACE</p><h2 id={`action-${action.id}`}>{action.label}</h2>
      {action.id === "create-member" && <Notice kind="warning">This creates a company user and membership only. The new user must verify their email before signing in.</Notice>}
      {action.id === "register-company" && <Notice kind="info">The first Admin belongs to this company only; they are not added as a platform member.</Notice>}
      {action.id === "generate-items" && <Notice kind="warning">Codes are not returned in this response. The API creates a print-export job. Each attempt uses a new idempotency key; do not repeat unless you intend to create a separate generation request.</Notice>}
      {localError && <Notice kind="error">{localError}</Notice>}
      <form className="form-stack action-form" onSubmit={submit}>
        {(action.fields || []).map((field) => {
          const error = fieldErrors[field.name];
          const message = Array.isArray(error) ? error.join(", ") : error;
          if (field.type === "select") return <div key={field.name}><SelectField label={field.label} value={values[field.name] || ""} required={field.required} aria-invalid={Boolean(message)} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}><option value="">Choose a role</option>{field.options?.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</SelectField>{message && <small className="field-error" role="alert">{message}</small>}</div>;
          if (field.type === "textarea") return <label className="field" key={field.name}><span>{field.label}</span><textarea rows={7} required={field.required} aria-invalid={Boolean(message)} value={values[field.name] || ""} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} placeholder={field.name === "body" ? '{\n  "policyField": "value"\n}' : undefined} />{field.hint && <small>{field.hint}</small>}{message && <small className="field-error" role="alert">{message}</small>}</label>;
          return <Field key={field.name} label={field.label} type={field.type || "text"} required={field.required} hint={field.hint} error={message} autoComplete={field.type === "password" ? "new-password" : undefined} value={values[field.name] || ""} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} />;
        })}
        <div className="dialog-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : action.label}</Button></div>
      </form>
    </section>
  </div>;
}
