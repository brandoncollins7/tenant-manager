import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('RoomsService', () => {
  let service: RoomsService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    const createDto = {
      unitId: 'unit-1',
      roomNumber: '101',
    };

    it('should create a room successfully', async () => {
      const mockRoom = {
        id: 'room-1',
        unitId: 'unit-1',
        roomNumber: '101',
        unit: { id: 'unit-1', name: 'Building A' },
        tenant: null,
      };

      prisma.unit.findUnique.mockResolvedValue({ id: 'unit-1' } as any);
      prisma.room.findUnique.mockResolvedValue(null);
      prisma.room.create.mockResolvedValue(mockRoom as any);

      const result = await service.create(createDto);

      expect(result).toEqual(mockRoom);
      expect(prisma.room.create).toHaveBeenCalledWith({
        data: createDto,
        include: {
          unit: true,
          tenant: {
            select: {
              id: true,
              email: true,
              isActive: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when unit does not exist', async () => {
      prisma.unit.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow('Unit not found');
    });

    it('should throw ConflictException when room number already exists in unit', async () => {
      prisma.unit.findUnique.mockResolvedValue({ id: 'unit-1' } as any);
      prisma.room.findUnique.mockResolvedValue({ id: 'existing-room' } as any);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Room number already exists in this unit',
      );
    });
  });

  describe('findAll', () => {
    it('should return all rooms when no unitId provided', async () => {
      const mockRooms = [
        { id: 'room-1', roomNumber: '101', unit: {}, tenant: null },
        { id: 'room-2', roomNumber: '102', unit: {}, tenant: null },
      ];

      prisma.room.findMany.mockResolvedValue(mockRooms as any);

      const result = await service.findAll();

      expect(result).toEqual(mockRooms);
      expect(prisma.room.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: {
          unit: true,
          tenant: {
            select: {
              id: true,
              email: true,
              isActive: true,
            },
          },
        },
        orderBy: [{ unit: { name: 'asc' } }, { roomNumber: 'asc' }],
      });
    });

    it('should filter rooms by unitId when provided', async () => {
      prisma.room.findMany.mockResolvedValue([]);

      await service.findAll('unit-1');

      expect(prisma.room.findMany).toHaveBeenCalledWith({
        where: { unitId: 'unit-1' },
        include: {
          unit: true,
          tenant: {
            select: {
              id: true,
              email: true,
              isActive: true,
            },
          },
        },
        orderBy: [{ unit: { name: 'asc' } }, { roomNumber: 'asc' }],
      });
    });
  });

  describe('findOne', () => {
    it('should return a room by id with active tenant', async () => {
      const mockRoom = {
        id: 'room-1',
        roomNumber: '101',
        unit: { id: 'unit-1' },
        tenant: { id: 'tenant-1', isActive: true, occupants: [] },
      };

      prisma.room.findUnique.mockResolvedValue(mockRoom as any);

      const result = await service.findOne('room-1');

      expect(result).toEqual(mockRoom);
      expect(prisma.room.findUnique).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        include: {
          unit: true,
          tenant: {
            include: {
              occupants: {
                where: { isActive: true },
              },
            },
          },
        },
      });
    });

    it('should filter out inactive tenant from room', async () => {
      const mockRoom = {
        id: 'room-1',
        roomNumber: '101',
        unit: { id: 'unit-1' },
        tenant: { id: 'tenant-1', isActive: false, occupants: [] },
      };

      prisma.room.findUnique.mockResolvedValue(mockRoom as any);

      const result = await service.findOne('room-1');

      expect(result.tenant).toBeNull();
    });

    it('should throw NotFoundException when room does not exist', async () => {
      prisma.room.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow('Room not found');
    });
  });

  describe('update', () => {
    it('should update room details', async () => {
      const existingRoom = {
        id: 'room-1',
        roomNumber: '101',
        unit: {},
        tenant: null,
      };

      const updatedRoom = {
        id: 'room-1',
        roomNumber: '102',
        unit: {},
        tenant: null,
      };

      prisma.room.findUnique.mockResolvedValue(existingRoom as any);
      prisma.room.update.mockResolvedValue(updatedRoom as any);

      const result = await service.update('room-1', { roomNumber: '102' });

      expect(result).toEqual(updatedRoom);
      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: { roomNumber: '102' },
        include: {
          unit: true,
          tenant: {
            select: {
              id: true,
              email: true,
              isActive: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when room does not exist', async () => {
      prisma.room.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', { roomNumber: '102' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a room without tenant', async () => {
      const mockRoom = {
        id: 'room-1',
        roomNumber: '101',
        unit: {},
        tenant: null,
      };

      prisma.room.findUnique.mockResolvedValue(mockRoom as any);
      prisma.room.delete.mockResolvedValue(mockRoom as any);

      const result = await service.remove('room-1');

      expect(result).toEqual(mockRoom);
      expect(prisma.room.delete).toHaveBeenCalledWith({
        where: { id: 'room-1' },
      });
    });

    it('should throw ConflictException when room has active tenant', async () => {
      const mockRoom = {
        id: 'room-1',
        roomNumber: '101',
        unit: {},
        tenant: { id: 'tenant-1', email: 'tenant@example.com', isActive: true },
      };

      prisma.room.findUnique.mockResolvedValue(mockRoom as any);

      await expect(service.remove('room-1')).rejects.toThrow(ConflictException);
      await expect(service.remove('room-1')).rejects.toThrow(
        'Cannot delete room with active tenant',
      );
    });

    it('should allow delete when room has inactive tenant', async () => {
      const mockRoom = {
        id: 'room-1',
        roomNumber: '101',
        unit: {},
        tenant: { id: 'tenant-1', email: 'tenant@example.com', isActive: false },
      };

      prisma.room.findUnique.mockResolvedValue(mockRoom as any);
      prisma.room.delete.mockResolvedValue(mockRoom as any);

      // Should not throw because tenant is inactive (filtered out)
      const result = await service.remove('room-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when room does not exist', async () => {
      prisma.room.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
