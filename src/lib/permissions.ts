export type CompanyRole = "ADMIN" | "PRODUCT_MANAGER" | "EDITOR";
export type PlatformRole =
  | "SUPER_ADMIN"
  | "PLATFORM_ADMIN"
  | "PLATFORM_SUPPORT"
  | "PLATFORM_VIEWER";

const companyAccess: Record<CompanyRole, string[]> = {
  ADMIN: [
    "overview",
    "members",
    "invitations",
    "products",
    "batches",
    "items",
    "exports",
    "company-policy",
    "product-policy",
    "billing",
  ],
  PRODUCT_MANAGER: ["overview", "products", "batches", "items"],
  EDITOR: ["overview", "products", "batches", "items"],
};

const platformAccess: Record<PlatformRole, string[]> = {
  SUPER_ADMIN: ["overview", "members", "companies", "audit-logs", "plans", "onboard"],
  PLATFORM_ADMIN: ["overview", "members", "companies", "audit-logs", "plans", "onboard"],
  PLATFORM_SUPPORT: ["overview", "companies", "audit-logs"],
  PLATFORM_VIEWER: ["overview", "members", "companies", "audit-logs", "plans"],
};

export function canAccessCompanySection(role: string | undefined, section: string): boolean {
  return Boolean(role && companyAccess[role as CompanyRole]?.includes(section));
}

export function canAccessPlatformSection(role: string | undefined, section: string): boolean {
  return Boolean(role && platformAccess[role as PlatformRole]?.includes(section));
}

export function companyActions(role: string | undefined) {
  return {
    manageMembers: role === "ADMIN",
    manageBilling: role === "ADMIN",
    manageExports: role === "ADMIN",
    generateItems: role === "ADMIN" || role === "PRODUCT_MANAGER",
    revokeItems: role === "ADMIN",
    editProducts: role === "ADMIN" || role === "PRODUCT_MANAGER" || role === "EDITOR",
    managePolicies: role === "ADMIN",
  };
}

export function assignablePlatformRoles(role: string | undefined): PlatformRole[] {
  if (role === "SUPER_ADMIN") {
    return ["SUPER_ADMIN", "PLATFORM_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_VIEWER"];
  }
  if (role === "PLATFORM_ADMIN") return ["PLATFORM_SUPPORT", "PLATFORM_VIEWER"];
  return [];
}

export function displayFullName(user: {
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
}): string {
  return [user.firstName, user.middleName, user.lastName].map((part) => part?.trim()).filter(Boolean).join(" ");
}
