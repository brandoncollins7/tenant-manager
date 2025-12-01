import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { UnitAccessGuard } from './unit-access.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRole } from '../constants/admin-roles';
import { UNIT_SCOPED_KEY } from '../decorators/unit-scoped.decorator';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('UnitAccessGuard', () => {
  let guard: UnitAccessGuard;
  let reflector: Reflector;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitAccessGuard,
        Reflector,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    guard = module.get<UnitAccessGuard>(UnitAccessGuard);
    reflector = module.get<Reflector>(Reflector);
    prisma = module.get(PrismaService);
  });

  const createMockContext = (
    user: any,
    params: Record<string, string> = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
      getHandler: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('when no @UnitScoped decorator is present', () => {
    it('should allow access', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(undefined);
      const context = createMockContext({ isAdmin: true });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('when user is a super admin', () => {
    it('should allow access without checking unit', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'tenant', param: 'id' });
      const context = createMockContext(
        {
          isAdmin: true,
          adminRole: AdminRole.SUPER_ADMIN,
          unitIds: [],
        },
        { id: 'tenant-1' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('when user is a property manager', () => {
    const propertyManagerUser = {
      isAdmin: true,
      adminRole: AdminRole.PROPERTY_MANAGER,
      unitIds: ['unit-1', 'unit-2'],
    };

    it('should allow access when tenant belongs to assigned unit', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'tenant', param: 'id' });
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        room: { unitId: 'unit-1' },
      } as any);

      const context = createMockContext(propertyManagerUser, { id: 'tenant-1' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when tenant belongs to different unit', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'tenant', param: 'id' });
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        room: { unitId: 'unit-999' },
      } as any);

      const context = createMockContext(propertyManagerUser, { id: 'tenant-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Access denied to this resource');
    });

    it('should throw NotFoundException when tenant not found', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'tenant', param: 'id' });
      prisma.tenant.findUnique.mockResolvedValue(null);

      const context = createMockContext(propertyManagerUser, { id: 'nonexistent' });

      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when tenant has no room assigned', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'tenant', param: 'id' });
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        room: null,
      } as any);

      const context = createMockContext(propertyManagerUser, { id: 'tenant-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    });

    it('should resolve unit from room resource', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'room', param: 'id' });
      prisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        unitId: 'unit-1',
      } as any);

      const context = createMockContext(propertyManagerUser, { id: 'room-1' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should resolve unit from occupant resource', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'occupant', param: 'id' });
      prisma.occupant.findUnique.mockResolvedValue({
        id: 'occupant-1',
        tenant: { room: { unitId: 'unit-1' } },
      } as any);

      const context = createMockContext(propertyManagerUser, { id: 'occupant-1' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should resolve unit from photo resource (uses tenantId)', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'photo', param: 'tenantId' });
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        room: { unitId: 'unit-1' },
      } as any);

      const context = createMockContext(propertyManagerUser, { tenantId: 'tenant-1' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should use custom param name from decorator', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'tenant', param: 'tenantId' });
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        room: { unitId: 'unit-1' },
      } as any);

      const context = createMockContext(propertyManagerUser, { tenantId: 'tenant-1' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        select: { room: { select: { unitId: true } } },
      });
    });
  });

  describe('when property manager has no unit assignments', () => {
    it('should deny access', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'tenant', param: 'id' });
      const context = createMockContext(
        {
          isAdmin: true,
          adminRole: AdminRole.PROPERTY_MANAGER,
          unitIds: [],
        },
        { id: 'tenant-1' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('No unit access assigned');
    });

    it('should deny access when unitIds is undefined', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'tenant', param: 'id' });
      const context = createMockContext(
        {
          isAdmin: true,
          adminRole: AdminRole.PROPERTY_MANAGER,
        },
        { id: 'tenant-1' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('when user is not authenticated', () => {
    it('should deny access when user is null', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'tenant', param: 'id' });
      const context = createMockContext(null, { id: 'tenant-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Authentication required');
    });

    it('should deny access when user is undefined', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'tenant', param: 'id' });
      const context = createMockContext(undefined, { id: 'tenant-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('when user is a tenant (non-admin)', () => {
    it('should allow access (tenant-specific checks handled elsewhere)', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'tenant', param: 'id' });
      const context = createMockContext(
        {
          isAdmin: false,
          tenantId: 'tenant-1',
        },
        { id: 'tenant-1' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('when resource ID is missing from params', () => {
    it('should deny access', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue({ resource: 'tenant', param: 'id' });
      const context = createMockContext(
        {
          isAdmin: true,
          adminRole: AdminRole.PROPERTY_MANAGER,
          unitIds: ['unit-1'],
        },
        {},
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Resource ID not found in request');
    });
  });
});