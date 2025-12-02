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
        startDate: '2024-01-01T00:00:00.000Z',
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
          startDate: new Date(dto.startDate),
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
        startDate: new Date().toISOString(),
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

    it('should filter by admin unit assignments for property managers', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);

      await service.findAll(undefined, 'PROPERTY_MANAGER', ['unit-1', 'unit-2']);

      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        where: {
          room: { unitId: { in: ['unit-1', 'unit-2'] } },
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

    it('should update endDate when provided', async () => {
      const existingTenant = { id: 'tenant-1', email: 'test@example.com' };
      const updatedTenant = { id: 'tenant-1', endDate: new Date('2025-12-31') };

      prisma.tenant.findUnique.mockResolvedValue(existingTenant as any);
      prisma.tenant.update.mockResolvedValue(updatedTenant as any);

      await service.update('tenant-1', { endDate: '2025-12-31' });

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { endDate: new Date('2025-12-31') },
        include: expect.any(Object),
      });
    });

    it('should clear endDate when empty string provided', async () => {
      const existingTenant = { id: 'tenant-1', endDate: new Date() };

      prisma.tenant.findUnique.mockResolvedValue(existingTenant as any);
      prisma.tenant.update.mockResolvedValue({ ...existingTenant, endDate: null } as any);

      // Empty string should be converted to null by the service
      await service.update('tenant-1', { endDate: '' });

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { endDate: null },
        include: expect.any(Object),
      });
    });

    it('should disconnect room when roomId is null', async () => {
      const existingTenant = { id: 'tenant-1', roomId: 'room-1' };

      prisma.tenant.findUnique.mockResolvedValue(existingTenant as any);
      prisma.tenant.update.mockResolvedValue({ ...existingTenant, roomId: null } as any);

      await service.update('tenant-1', { roomId: null });

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { room: { disconnect: true } },
        include: expect.any(Object),
      });
    });

    it('should connect to new room when roomId provided', async () => {
      const existingTenant = { id: 'tenant-1', roomId: null };

      prisma.tenant.findUnique.mockResolvedValue(existingTenant as any);
      prisma.tenant.update.mockResolvedValue({ ...existingTenant, roomId: 'room-2' } as any);

      await service.update('tenant-1', { roomId: 'room-2' });

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { room: { connect: { id: 'room-2' } } },
        include: expect.any(Object),
      });
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

  describe('Lease Versioning', () => {
    describe('uploadLeaseVersion', () => {
      it('should create version 1 when uploading first lease', async () => {
        const mockLeaseDoc = {
          id: 'lease-1',
          tenantId: 'tenant-1',
          version: 1,
          filename: 'lease-file.pdf',
          uploadedBy: 'admin@test.com',
          uploadedAt: new Date(),
          notes: 'Initial lease',
          isCurrent: true,
        };

        prisma.$transaction.mockImplementation(async (callback: any) => {
          return callback({
            leaseDocument: {
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue(mockLeaseDoc),
            },
            tenant: {
              update: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
            },
          } as any);
        });

        const result = await service.uploadLeaseVersion(
          'tenant-1',
          'lease-file.pdf',
          'admin@test.com',
          'Initial lease',
        );

        expect(result.version).toBe(1);
        expect(result.isCurrent).toBe(true);
        expect(result.uploadedBy).toBe('admin@test.com');
        expect(result.notes).toBe('Initial lease');
      });

      it('should increment version and mark old as not current', async () => {
        const mockLeaseDoc = {
          id: 'lease-2',
          tenantId: 'tenant-1',
          version: 2,
          filename: 'v2.pdf',
          uploadedBy: 'admin@test.com',
          uploadedAt: new Date(),
          notes: null,
          isCurrent: true,
        };

        prisma.$transaction.mockImplementation(async (callback: any) => {
          return callback({
            leaseDocument: {
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
              findFirst: jest.fn().mockResolvedValue({ version: 1 }),
              create: jest.fn().mockResolvedValue(mockLeaseDoc),
            },
            tenant: {
              update: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
            },
          } as any);
        });

        const result = await service.uploadLeaseVersion('tenant-1', 'v2.pdf', 'admin@test.com');

        expect(result.version).toBe(2);
        expect(result.isCurrent).toBe(true);
      });

      it('should update tenant.leaseDocument to point to current version', async () => {
        const mockLeaseDoc = {
          id: 'lease-1',
          tenantId: 'tenant-1',
          version: 1,
          filename: 'new-lease.pdf',
          uploadedBy: 'admin@test.com',
          uploadedAt: new Date(),
          notes: null,
          isCurrent: true,
        };

        let tenantUpdateCalled = false;
        let updatedFilename = '';

        prisma.$transaction.mockImplementation(async (callback: any) => {
          return callback({
            leaseDocument: {
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue(mockLeaseDoc),
            },
            tenant: {
              update: jest.fn().mockImplementation(({ data }) => {
                tenantUpdateCalled = true;
                updatedFilename = data.leaseDocument;
                return Promise.resolve({ id: 'tenant-1' });
              }),
            },
          } as any);
        });

        await service.uploadLeaseVersion('tenant-1', 'new-lease.pdf', 'admin@test.com');

        expect(tenantUpdateCalled).toBe(true);
        expect(updatedFilename).toBe('new-lease.pdf');
      });

      it('should handle optional notes', async () => {
        const mockWithNotes = {
          id: 'lease-1',
          tenantId: 'tenant-1',
          version: 1,
          filename: 'lease.pdf',
          uploadedBy: 'admin@test.com',
          uploadedAt: new Date(),
          notes: 'Rent increase',
          isCurrent: true,
        };

        prisma.$transaction.mockImplementation(async (callback: any) => {
          return callback({
            leaseDocument: {
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue(mockWithNotes),
            },
            tenant: {
              update: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
            },
          } as any);
        });

        const result = await service.uploadLeaseVersion(
          'tenant-1',
          'lease.pdf',
          'admin@test.com',
          'Rent increase',
        );

        expect(result.notes).toBe('Rent increase');
      });
    });

    describe('getLeaseHistory', () => {
      it('should return lease history in descending order', async () => {
        const mockHistory = [
          { id: 'lease-3', version: 3, isCurrent: true },
          { id: 'lease-2', version: 2, isCurrent: false },
          { id: 'lease-1', version: 1, isCurrent: false },
        ];

        prisma.leaseDocument.findMany.mockResolvedValue(mockHistory as any);

        const result = await service.getLeaseHistory('tenant-1');

        expect(result).toHaveLength(3);
        expect(result[0].version).toBe(3);
        expect(result[2].version).toBe(1);
        expect(prisma.leaseDocument.findMany).toHaveBeenCalledWith({
          where: { tenantId: 'tenant-1' },
          orderBy: { version: 'desc' },
        });
      });

      it('should return empty array when no leases exist', async () => {
        prisma.leaseDocument.findMany.mockResolvedValue([]);

        const result = await service.getLeaseHistory('tenant-1');

        expect(result).toEqual([]);
      });
    });

    describe('getLeaseVersion', () => {
      it('should return specific version by number', async () => {
        const mockLease = {
          id: 'lease-2',
          tenantId: 'tenant-1',
          version: 2,
          filename: 'lease-v2.pdf',
        };

        prisma.leaseDocument.findUnique.mockResolvedValue(mockLease as any);

        const result = await service.getLeaseVersion('tenant-1', 2);

        expect(result).toEqual(mockLease);
        expect(prisma.leaseDocument.findUnique).toHaveBeenCalledWith({
          where: {
            tenantId_version: { tenantId: 'tenant-1', version: 2 },
          },
        });
      });

      it('should return null when version does not exist', async () => {
        prisma.leaseDocument.findUnique.mockResolvedValue(null);

        const result = await service.getLeaseVersion('tenant-1', 999);

        expect(result).toBeNull();
      });
    });

    describe('getCurrentLease', () => {
      it('should return the current lease version', async () => {
        const mockLease = {
          id: 'lease-3',
          tenantId: 'tenant-1',
          version: 3,
          isCurrent: true,
          filename: 'current-lease.pdf',
        };

        prisma.leaseDocument.findFirst.mockResolvedValue(mockLease as any);

        const result = await service.getCurrentLease('tenant-1');

        expect(result).toEqual(mockLease);
        expect(result?.isCurrent).toBe(true);
        expect(prisma.leaseDocument.findFirst).toHaveBeenCalledWith({
          where: { tenantId: 'tenant-1', isCurrent: true },
        });
      });

      it('should return null when no current lease exists', async () => {
        prisma.leaseDocument.findFirst.mockResolvedValue(null);

        const result = await service.getCurrentLease('tenant-1');

        expect(result).toBeNull();
      });
    });
  });
});
