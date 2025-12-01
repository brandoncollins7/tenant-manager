import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UNIT_SCOPED_KEY,
  UnitScopedOptions,
  UnitScopedResource,
} from '../decorators/unit-scoped.decorator';
import { AdminRole } from '../constants/admin-roles';

@Injectable()
export class UnitAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<UnitScopedOptions>(
      UNIT_SCOPED_KEY,
      context.getHandler(),
    );

    // No @UnitScoped decorator, allow access
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Must be authenticated
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Super admins bypass unit checks
    if (user.adminRole === AdminRole.SUPER_ADMIN) {
      return true;
    }

    // Non-admin users (tenants) - they access their own data via other guards
    if (!user.isAdmin) {
      return true;
    }

    // Property managers must have unit assignments
    if (!user.unitIds || user.unitIds.length === 0) {
      throw new ForbiddenException('No unit access assigned');
    }

    const resourceId = request.params[options.param];
    if (!resourceId) {
      throw new ForbiddenException('Resource ID not found in request');
    }

    const unitId = await this.resolveUnitId(options.resource, resourceId);
    if (!unitId) {
      throw new NotFoundException('Resource not found');
    }

    if (!user.unitIds.includes(unitId)) {
      throw new ForbiddenException('Access denied to this resource');
    }

    return true;
  }

  private async resolveUnitId(
    resource: UnitScopedResource,
    id: string,
  ): Promise<string | null> {
    switch (resource) {
      case 'tenant': {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id },
          select: { room: { select: { unitId: true } } },
        });
        return tenant?.room?.unitId ?? null;
      }

      case 'room': {
        const room = await this.prisma.room.findUnique({
          where: { id },
          select: { unitId: true },
        });
        return room?.unitId ?? null;
      }

      case 'occupant': {
        const occupant = await this.prisma.occupant.findUnique({
          where: { id },
          select: { tenant: { select: { room: { select: { unitId: true } } } } },
        });
        return occupant?.tenant?.room?.unitId ?? null;
      }

      case 'photo': {
        // Photos are stored as tenantId/filename, so id here is tenantId
        const tenant = await this.prisma.tenant.findUnique({
          where: { id },
          select: { room: { select: { unitId: true } } },
        });
        return tenant?.room?.unitId ?? null;
      }

      default:
        return null;
    }
  }
}