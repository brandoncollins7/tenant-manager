import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UnitsService } from './units.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('UnitsService', () => {
  let service: UnitsService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get<UnitsService>(UnitsService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a unit with default timezone', async () => {
      const dto = { name: 'Building A' };
      const mockUnit = {
        id: 'unit-1',
        name: 'Building A',
        timezone: 'America/Toronto',
        rooms: [],
        chores: [],
      };

      prisma.unit.create.mockResolvedValue(mockUnit as any);

      const result = await service.create(dto);

      expect(result).toEqual(mockUnit);
      expect(prisma.unit.create).toHaveBeenCalledWith({
        data: {
          name: 'Building A',
          timezone: 'America/Toronto',
        },
        include: {
          rooms: true,
          chores: true,
        },
      });
    });

    it('should create a unit with custom timezone', async () => {
      const dto = { name: 'Building B', timezone: 'America/New_York' };
      const mockUnit = {
        id: 'unit-2',
        name: 'Building B',
        timezone: 'America/New_York',
        rooms: [],
        chores: [],
      };

      prisma.unit.create.mockResolvedValue(mockUnit as any);

      const result = await service.create(dto);

      expect(result).toEqual(mockUnit);
      expect(prisma.unit.create).toHaveBeenCalledWith({
        data: {
          name: 'Building B',
          timezone: 'America/New_York',
        },
        include: {
          rooms: true,
          chores: true,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return all units with rooms and counts', async () => {
      const mockUnits = [
        {
          id: 'unit-1',
          name: 'Building A',
          rooms: [{ id: 'room-1', tenant: null }],
          _count: { rooms: 1, chores: 2 },
        },
        {
          id: 'unit-2',
          name: 'Building B',
          rooms: [],
          _count: { rooms: 0, chores: 0 },
        },
      ];

      prisma.unit.findMany.mockResolvedValue(mockUnits as any);

      const result = await service.findAll();

      expect(result).toEqual(mockUnits);
      expect(prisma.unit.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          rooms: {
            include: {
              tenant: {
                select: {
                  id: true,
                  email: true,
                  isActive: true,
                },
              },
            },
          },
          _count: {
            select: {
              rooms: true,
              chores: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a unit by id', async () => {
      const mockUnit = {
        id: 'unit-1',
        name: 'Building A',
        rooms: [{ id: 'room-1', tenant: null }],
        chores: [{ id: 'chore-1', name: 'Kitchen' }],
      };

      prisma.unit.findUnique.mockResolvedValue(mockUnit as any);

      const result = await service.findOne('unit-1');

      expect(result).toEqual(mockUnit);
      expect(prisma.unit.findUnique).toHaveBeenCalledWith({
        where: { id: 'unit-1' },
        include: {
          rooms: {
            include: {
              tenant: {
                select: {
                  id: true,
                  email: true,
                  isActive: true,
                },
              },
            },
          },
          chores: true,
        },
      });
    });

    it('should throw NotFoundException when unit does not exist', async () => {
      prisma.unit.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow('Unit not found');
    });
  });

  describe('update', () => {
    it('should update unit details', async () => {
      const existingUnit = {
        id: 'unit-1',
        name: 'Building A',
        rooms: [],
        chores: [],
      };

      const updatedUnit = {
        id: 'unit-1',
        name: 'Building A Updated',
        timezone: 'America/Los_Angeles',
        rooms: [],
        chores: [],
      };

      prisma.unit.findUnique.mockResolvedValue(existingUnit as any);
      prisma.unit.update.mockResolvedValue(updatedUnit as any);

      const result = await service.update('unit-1', {
        name: 'Building A Updated',
        timezone: 'America/Los_Angeles',
      });

      expect(result).toEqual(updatedUnit);
      expect(prisma.unit.update).toHaveBeenCalledWith({
        where: { id: 'unit-1' },
        data: {
          name: 'Building A Updated',
          timezone: 'America/Los_Angeles',
        },
        include: {
          rooms: true,
          chores: true,
        },
      });
    });

    it('should throw NotFoundException when unit does not exist', async () => {
      prisma.unit.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a unit', async () => {
      const mockUnit = {
        id: 'unit-1',
        name: 'Building A',
        rooms: [],
        chores: [],
      };

      prisma.unit.findUnique.mockResolvedValue(mockUnit as any);
      prisma.unit.delete.mockResolvedValue(mockUnit as any);

      const result = await service.remove('unit-1');

      expect(result).toEqual(mockUnit);
      expect(prisma.unit.delete).toHaveBeenCalledWith({
        where: { id: 'unit-1' },
      });
    });

    it('should throw NotFoundException when unit does not exist', async () => {
      prisma.unit.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
