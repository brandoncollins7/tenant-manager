import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OccupantsService } from './occupants.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('OccupantsService', () => {
  let service: OccupantsService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OccupantsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get<OccupantsService>(OccupantsService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create an occupant with available chore day', async () => {
      const mockTenant = {
        id: 'tenant-1',
        room: { unitId: 'unit-1' },
      };
      const mockOccupant = {
        id: 'occupant-1',
        name: 'John',
        choreDay: 1,
        tenantId: 'tenant-1',
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);
      prisma.occupant.findFirst.mockResolvedValue(null);
      prisma.occupant.create.mockResolvedValue(mockOccupant as any);

      const result = await service.create('tenant-1', { name: 'John', choreDay: 1 });

      expect(result).toEqual(mockOccupant);
      expect(prisma.occupant.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          name: 'John',
          choreDay: 1,
        },
      });
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.create('invalid-id', { name: 'John', choreDay: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when chore day is taken', async () => {
      const mockTenant = {
        id: 'tenant-1',
        room: { unitId: 'unit-1' },
      };
      const existingOccupant = {
        id: 'occupant-2',
        choreDay: 1,
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);
      prisma.occupant.findFirst.mockResolvedValue(existingOccupant as any);

      await expect(
        service.create('tenant-1', { name: 'John', choreDay: 1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByTenant', () => {
    it('should return all active occupants for a tenant', async () => {
      const mockOccupants = [
        { id: 'occupant-1', name: 'John', choreDay: 1, isActive: true },
        { id: 'occupant-2', name: 'Jane', choreDay: 3, isActive: true },
      ];

      prisma.occupant.findMany.mockResolvedValue(mockOccupants as any);

      const result = await service.findByTenant('tenant-1');

      expect(result).toEqual(mockOccupants);
      expect(prisma.occupant.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          isActive: true,
        },
        orderBy: { choreDay: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return an occupant by id', async () => {
      const mockOccupant = {
        id: 'occupant-1',
        name: 'John',
        tenant: {
          room: { unit: {} },
        },
      };

      prisma.occupant.findUnique.mockResolvedValue(mockOccupant as any);

      const result = await service.findOne('occupant-1');

      expect(result).toEqual(mockOccupant);
    });

    it('should throw NotFoundException when occupant does not exist', async () => {
      prisma.occupant.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update occupant name', async () => {
      const existingOccupant = {
        id: 'occupant-1',
        name: 'John',
        choreDay: 1,
        tenant: { room: { unitId: 'unit-1' } },
      };
      const updatedOccupant = {
        ...existingOccupant,
        name: 'Johnny',
      };

      prisma.occupant.findUnique.mockResolvedValue(existingOccupant as any);
      prisma.occupant.update.mockResolvedValue(updatedOccupant as any);

      const result = await service.update('occupant-1', { name: 'Johnny' });

      expect(result.name).toBe('Johnny');
    });

    it('should update chore day when available', async () => {
      const existingOccupant = {
        id: 'occupant-1',
        name: 'John',
        choreDay: 1,
        tenant: { room: { unitId: 'unit-1' } },
      };

      prisma.occupant.findUnique.mockResolvedValue(existingOccupant as any);
      prisma.occupant.findFirst.mockResolvedValue(null);
      prisma.occupant.update.mockResolvedValue({ ...existingOccupant, choreDay: 2 } as any);

      const result = await service.update('occupant-1', { choreDay: 2 });

      expect(result.choreDay).toBe(2);
    });

    it('should throw BadRequestException when new chore day is taken', async () => {
      const existingOccupant = {
        id: 'occupant-1',
        name: 'John',
        choreDay: 1,
        tenant: { room: { unitId: 'unit-1' } },
      };
      const conflictingOccupant = {
        id: 'occupant-2',
        choreDay: 2,
      };

      prisma.occupant.findUnique.mockResolvedValue(existingOccupant as any);
      prisma.occupant.findFirst.mockResolvedValue(conflictingOccupant as any);

      await expect(service.update('occupant-1', { choreDay: 2 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow keeping the same chore day', async () => {
      const existingOccupant = {
        id: 'occupant-1',
        name: 'John',
        choreDay: 1,
        tenant: { room: { unitId: 'unit-1' } },
      };

      prisma.occupant.findUnique.mockResolvedValue(existingOccupant as any);
      prisma.occupant.update.mockResolvedValue(existingOccupant as any);

      // When updating with the same choreDay, it shouldn't check for conflicts
      const result = await service.update('occupant-1', { choreDay: 1 });

      expect(result.choreDay).toBe(1);
      expect(prisma.occupant.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete an occupant', async () => {
      const existingOccupant = {
        id: 'occupant-1',
        isActive: true,
        tenant: { room: { unit: {} } },
      };

      prisma.occupant.findUnique.mockResolvedValue(existingOccupant as any);
      prisma.occupant.update.mockResolvedValue({ ...existingOccupant, isActive: false } as any);

      const result = await service.remove('occupant-1');

      expect(result.isActive).toBe(false);
      expect(prisma.occupant.update).toHaveBeenCalledWith({
        where: { id: 'occupant-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when occupant does not exist', async () => {
      prisma.occupant.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAvailableDays', () => {
    it('should return all days with availability status', async () => {
      const takenDays = [{ choreDay: 1 }, { choreDay: 3 }];

      prisma.occupant.findMany.mockResolvedValue(takenDays as any);

      const result = await service.getAvailableDays('unit-1');

      expect(result).toHaveLength(7);
      expect(result[0]).toEqual({ day: 0, name: 'Sunday', available: true });
      expect(result[1]).toEqual({ day: 1, name: 'Monday', available: false });
      expect(result[2]).toEqual({ day: 2, name: 'Tuesday', available: true });
      expect(result[3]).toEqual({ day: 3, name: 'Wednesday', available: false });
    });

    it('should return all days as available when no occupants', async () => {
      prisma.occupant.findMany.mockResolvedValue([]);

      const result = await service.getAvailableDays('unit-1');

      expect(result.every((d) => d.available)).toBe(true);
    });
  });
});
