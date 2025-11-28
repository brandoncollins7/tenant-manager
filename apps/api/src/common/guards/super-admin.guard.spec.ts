import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';
import { AdminRole } from '../constants/admin-roles';

describe('SuperAdminGuard', () => {
  let guard: SuperAdminGuard;

  beforeEach(() => {
    guard = new SuperAdminGuard();
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;
  };

  it('should allow super admin access', () => {
    const context = createMockExecutionContext({
      isAdmin: true,
      adminRole: AdminRole.SUPER_ADMIN,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should block property manager', () => {
    const context = createMockExecutionContext({
      isAdmin: true,
      adminRole: AdminRole.PROPERTY_MANAGER,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Super admin access required');
  });

  it('should block non-admin users', () => {
    const context = createMockExecutionContext({
      isAdmin: false,
      adminRole: AdminRole.PROPERTY_MANAGER,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should block unauthenticated requests', () => {
    const context = createMockExecutionContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should block requests with no user object', () => {
    const context = createMockExecutionContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should block admin without role specified', () => {
    const context = createMockExecutionContext({
      isAdmin: true,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
