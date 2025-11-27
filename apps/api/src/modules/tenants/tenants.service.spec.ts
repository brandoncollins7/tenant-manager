import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a tenant with primary occupant', async () => {
      const dto = {
        email: 'Test@Example.com',
        roomId: 'room-1',
        primaryOccupantName: 'John Doe',
        choreDay: 1,
        startDate: new Date('2024-01-01'),
      };

      const mockTenant = {
        id: 'tenant-1',
        email: 'test@example.com',
        roomId: 'room-1',
        occupants: [{ id: 'occupant-1', name: 'John Doe', choreDay: 1 }],
        room: { id: 'room-1', unit: { id: 'unit-1' } },
      };

      prisma.tenant.create.mockResolvedValue(mockTenant as any);

      const result = await service.create(dto);

      expect(result).toEqual(mockTenant);
      expect(prisma.tenant.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          phone: undefined,
          roomId: 'room-1',
          startDate: dto.startDate,
          endDate: undefined,
          occupants: {
            create: {
              name: 'John Doe',
              choreDay: 1,
            },
          },
        },
        include: {
          occupants: true,
          room: {
            include: { unit: true },
          },
        },
      });
    });

    it('should normalize email to lowercase', async () => {
      const dto = {
        email: 'UPPER@CASE.COM',
        roomId: 'room-1',
        primaryOccupantName: 'John',
        choreDay: 1,
        startDate: new Date(),
      };

      prisma.tenant.create.mockResolvedValue({ email: 'upper@case.com' } as any);

      await service.create(dto);

      expect(prisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'upper@case.com',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all active tenants', async () => {
      const mockTenants = [
        { id: 'tenant-1', email: 'tenant1@example.com', isActive: true },
        { id: 'tenant-2', email: 'tenant2@example.com', isActive: true },
      ];

      prisma.tenant.findMany.mockResolvedValue(mockTenants as any);

      const result = await service.findAll();

      expect(result).toEqual(mockTenants);
      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: {
          occupants: { where: { isActive: true } },
          room: { include: { unit: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should filter by unit when unitId provided', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);

      await service.findAll('unit-1');

      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        where: {
          room: { unitId: 'unit-1' },
          isActive: true,
        },
        include: {
          occupants: { where: { isActive: true } },
          room: { include: { unit: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a tenant by id', async () => {
      const mockTenant = {
        id: 'tenant-1',
        email: 'tenant@example.com',
        occupants: [],
        room: { unit: {} },
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);

      const result = await service.findOne('tenant-1');

      expect(result).toEqual(mockTenant);
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update tenant details', async () => {
      const existingTenant = {
        id: 'tenant-1',
        email: 'old@example.com',
      };

      const updatedTenant = {
        id: 'tenant-1',
        email: 'new@example.com',
        phone: '123-456-7890',
      };

      prisma.tenant.findUnique.mockResolvedValue(existingTenant as any);
      prisma.tenant.update.mockResolvedValue(updatedTenant as any);

      const result = await service.update('tenant-1', {
        email: 'NEW@Example.com',
        phone: '123-456-7890',
      });

      expect(result.email).toBe('new@example.com');
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: {
          email: 'new@example.com',
          phone: '123-456-7890',
          endDate: undefined,
        },
        include: {
          occupants: { where: { isActive: true } },
          room: { include: { unit: true } },
        },
      });
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', { email: 'new@example.com' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a tenant', async () => {
      const existingTenant = { id: 'tenant-1', isActive: true };
      const deletedTenant = { id: 'tenant-1', isActive: false, endDate: new Date() };

      prisma.tenant.findUnique.mockResolvedValue(existingTenant as any);
      prisma.tenant.update.mockResolvedValue(deletedTenant as any);

      const result = await service.remove('tenant-1');

      expect(result.isActive).toBe(false);
      expect(result.endDate).toBeDefined();
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: {
          isActive: false,
          endDate: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
