import { describe, expect, it } from "vitest";
import { normalizeLoginUser } from "./auth";

describe("login response normalization", () => {
  it("preserves platform membership returned beside the nested user", () => {
    const user = normalizeLoginUser({
      user: {
        id: "user-1",
        email: "superadmin@example.com",
        firstName: "Super",
        lastName: "Admin",
      },
      memberships: [],
      platformMembership: { role: "SUPER_ADMIN" },
      csrfToken: "csrf",
    });

    expect(user).toMatchObject({
      email: "superadmin@example.com",
      memberships: [],
      platformMembership: { role: "SUPER_ADMIN" },
    });
  });

  it("uses root-level memberships when supplied, including empty arrays", () => {
    const user = normalizeLoginUser({
      user: {
        email: "member@example.com",
        firstName: "Member",
        lastName: "User",
        memberships: [{ role: "EDITOR" }],
      },
      memberships: [],
    });

    expect(user?.memberships).toEqual([]);
  });
});
