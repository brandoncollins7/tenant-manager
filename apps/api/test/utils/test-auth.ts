import { JwtService } from '@nestjs/jwt';
import { AdminRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
  tenantId?: string;
  adminId?: string;
  adminRole?: AdminRole;
  unitIds?: string[];
}

export interface TestUser {
  token: string;
  payload: JwtPayload;
}

export function createTestJwt(
  jwtService: JwtService,
  overrides: Partial<JwtPayload> = {},
): TestUser {
  const payload: JwtPayload = {
    sub: overrides.sub ?? 'test-user-id',
    email: overrides.email ?? 'test@example.com',
    isAdmin: overrides.isAdmin ?? false,
    tenantId: overrides.tenantId,
    adminId: overrides.adminId,
    adminRole: overrides.adminRole,
    unitIds: overrides.unitIds,
  };

  const token = jwtService.sign(payload);
  return { token, payload };
}

export function createTenantAuth(
  jwtService: JwtService,
  tenantId: string,
  email: string = 'tenant@example.com',
): TestUser {
  return createTestJwt(jwtService, {
    sub: tenantId,
    email,
    isAdmin: false,
    tenantId,
  });
}

export function createAdminAuth(
  jwtService: JwtService,
  adminId: string,
  role: AdminRole = 'PROPERTY_MANAGER',
  unitIds: string[] = [],
): TestUser {
  return createTestJwt(jwtService, {
    sub: adminId,
    email: 'admin@example.com',
    isAdmin: true,
    adminId,
    adminRole: role,
    unitIds,
  });
}

export function createSuperAdminAuth(
  jwtService: JwtService,
  adminId: string,
): TestUser {
  return createAdminAuth(jwtService, adminId, 'SUPER_ADMIN', []);
}
