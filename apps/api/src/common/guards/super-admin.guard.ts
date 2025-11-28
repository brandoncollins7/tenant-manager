import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AdminRole } from '../constants/admin-roles';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.isAdmin || user.adminRole !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin access required');
    }
    return true;
  }
}
