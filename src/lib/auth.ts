type MembershipFields<TMembership, TPlatformMembership> = {
  memberships?: TMembership[];
  companyMemberships?: TMembership[];
  platformMembership?: TPlatformMembership | null;
  platformMember?: TPlatformMembership | null;
};

export type LoginResponse<TUser extends MembershipFields<TMembership, TPlatformMembership>, TMembership, TPlatformMembership> = {
  csrfToken?: string;
  user?: TUser;
} & MembershipFields<TMembership, TPlatformMembership>;

export function normalizeLoginUser<
  TMembership,
  TPlatformMembership,
  TUser extends MembershipFields<TMembership, TPlatformMembership>,
>(
  response: LoginResponse<TUser, TMembership, TPlatformMembership>,
): (TUser & MembershipFields<TMembership, TPlatformMembership>) | undefined {
  if (!response.user) return undefined;

  return {
    ...response.user,
    ...(response.memberships !== undefined ? { memberships: response.memberships } : {}),
    ...(response.companyMemberships !== undefined ? { companyMemberships: response.companyMemberships } : {}),
    ...(response.platformMembership !== undefined ? { platformMembership: response.platformMembership } : {}),
    ...(response.platformMember !== undefined ? { platformMember: response.platformMember } : {}),
  };
}
