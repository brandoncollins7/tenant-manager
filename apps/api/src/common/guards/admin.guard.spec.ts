import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;
  };

  it('should allow access for admin users', () => {
    const context = createMockContext({ isAdmin: true });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException for non-admin users', () => {
    const context = createMockContext({ isAdmin: false });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Admin access required');
  });

  it('should throw ForbiddenException when user is undefined', () => {
    const context = createMockContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is null', () => {
    const context = createMockContext(null);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when isAdmin is not set', () => {
    const context = createMockContext({ email: 'test@example.com' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
