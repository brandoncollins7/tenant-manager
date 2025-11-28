export const AdminRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PROPERTY_MANAGER: 'PROPERTY_MANAGER',
} as const;

export type AdminRoleType = (typeof AdminRole)[keyof typeof AdminRole];
