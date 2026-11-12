import { describe, expect, it } from "vitest";
import {
  assignablePlatformRoles, canAccessCompanySection, canAccessPlatformSection, companyActions,
  displayFullName,
} from "./permissions";
import { createUserPayload } from "./payloads";
import { companyRegistrationPayload } from "./company-registration";

describe("role-aware access", () => {
  it("limits company member and billing management to company admins", () => {
    expect(canAccessCompanySection("ADMIN", "members")).toBe(true);
    expect(canAccessCompanySection("PRODUCT_MANAGER", "members")).toBe(false);
    expect(canAccessCompanySection("EDITOR", "billing")).toBe(false);
    expect(companyActions("EDITOR").generateItems).toBe(false);
    expect(companyActions("PRODUCT_MANAGER").generateItems).toBe(true);
  });

  it("only lets platform super admins assign privileged platform roles", () => {
    expect(assignablePlatformRoles("SUPER_ADMIN")).toContain("PLATFORM_ADMIN");
    expect(assignablePlatformRoles("PLATFORM_ADMIN")).toEqual(["PLATFORM_SUPPORT", "PLATFORM_VIEWER"]);
    expect(canAccessPlatformSection("PLATFORM_SUPPORT", "audit-logs")).toBe(true);
    expect(canAccessPlatformSection("PLATFORM_SUPPORT", "plans")).toBe(false);
  });
});

describe("account and user creation payloads", () => {
  it("omits a missing middle name without extra whitespace", () => {
    expect(displayFullName({ firstName: "Ada", lastName: "Lovelace" })).toBe("Ada Lovelace");
    expect(displayFullName({ firstName: "Ada", middleName: " Byron ", lastName: "Lovelace" })).toBe("Ada Byron Lovelace");
  });

  it("builds a company user payload without adding the account to another tenant", () => {
    expect(createUserPayload({
      email: "  person@example.com ", password: "pass  ", firstName: " Pat ",
      middleName: " ", lastName: " Member ", role: "EDITOR",
    })).toEqual({
      email: "person@example.com", password: "pass  ", firstName: "Pat", lastName: "Member", role: "EDITOR",
    });
  });

  it("keeps the first company Admin separate from platform membership", () => {
    expect(createUserPayload({
      companyName: "Northwind", email: "admin@example.com", password: "pass",
      firstName: "Admin", middleName: "", lastName: "Person",
    }, { companyName: "Northwind" })).toEqual({
      companyName: "Northwind", email: "admin@example.com", password: "pass", firstName: "Admin", lastName: "Person",
    });
  });

  it("submits only a company name for public company registration", () => {
    expect(companyRegistrationPayload("  Northwind Labs  ")).toEqual({ companyName: "Northwind Labs" });
    expect(Object.keys(companyRegistrationPayload("Example"))).toEqual(["companyName"]);
  });
});
