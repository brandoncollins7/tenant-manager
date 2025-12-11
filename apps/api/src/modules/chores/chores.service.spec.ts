import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ChoresService } from './chores.service';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('ChoresService', () => {
  let service: ChoresService;
  let prisma: DeepMockProxy<PrismaClient>;
  let scheduleService: jest.Mocked<ScheduleService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChoresService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        {
          provide: ScheduleService,
          useValue: {
            getOrCreateCurrentSchedule: jest.fn(),
            getScheduleForWeek: jest.fn(),
            getOrCreateScheduleForWeek: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChoresService>(ChoresService);
    prisma = module.get(PrismaService);
    scheduleService = module.get(ScheduleService);
  });

  describe('getChoreDefinitions', () => {
    it('should return active chore definitions for a unit', async () => {
      const mockChores = [
        { id: 'chore-1', name: 'Kitchen', description: null, icon: null, sortOrder: 1, unitId: 'unit-1', isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 'chore-2', name: 'Bathroom', description: null, icon: null, sortOrder: 2, unitId: 'unit-1', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ];

      prisma.choreDefinition.findMany.mockResolvedValue(mockChores);

      const result = await service.getChoreDefinitions('unit-1');

      expect(result).toEqual(mockChores);
      expect(prisma.choreDefinition.findMany).toHaveBeenCalledWith({
        where: { unitId: 'unit-1', isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('createChoreDefinition', () => {
    it('should create a chore definition with auto-incremented sortOrder', async () => {
      const mockChore = {
        id: 'chore-1',
        name: 'Kitchen',
        description: 'Clean kitchen',
        unitId: 'unit-1',
        sortOrder: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.choreDefinition.findFirst.mockResolvedValue({ sortOrder: 2 } as any);
      prisma.choreDefinition.create.mockResolvedValue(mockChore as any);

      const result = await service.createChoreDefinition({
        name: 'Kitchen',
        description: 'Clean kitchen',
        unitId: 'unit-1',
      });

      expect(result).toEqual(mockChore);
      expect(prisma.choreDefinition.create).toHaveBeenCalledWith({
        data: {
          name: 'Kitchen',
          description: 'Clean kitchen',
          unitId: 'unit-1',
          sortOrder: 3,
          isActive: true,
        },
      });
    });

    it('should create first chore with sortOrder 1', async () => {
      prisma.choreDefinition.findFirst.mockResolvedValue(null);
      prisma.choreDefinition.create.mockResolvedValue({ id: 'chore-1', sortOrder: 1 } as any);

      await service.createChoreDefinition({
        name: 'Kitchen',
        unitId: 'unit-1',
      });

      expect(prisma.choreDefinition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ sortOrder: 1 }),
      });
    });

    it('should use provided sortOrder if specified', async () => {
      prisma.choreDefinition.findFirst.mockResolvedValue({ sortOrder: 5 } as any);
      prisma.choreDefinition.create.mockResolvedValue({ id: 'chore-1', sortOrder: 10 } as any);

      await service.createChoreDefinition({
        name: 'Kitchen',
        unitId: 'unit-1',
        sortOrder: 10,
      });

      expect(prisma.choreDefinition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ sortOrder: 10 }),
      });
    });
  });

  describe('updateChoreDefinition', () => {
    it('should update chore definition', async () => {
      const updatedChore = {
        id: 'chore-1',
        name: 'Updated Kitchen',
        sortOrder: 5,
      };

      prisma.choreDefinition.update.mockResolvedValue(updatedChore as any);

      const result = await service.updateChoreDefinition('chore-1', {
        name: 'Updated Kitchen',
        sortOrder: 5,
      });

      expect(result).toEqual(updatedChore);
      expect(prisma.choreDefinition.update).toHaveBeenCalledWith({
        where: { id: 'chore-1' },
        data: { name: 'Updated Kitchen', sortOrder: 5 },
      });
    });
  });

  describe('deleteChoreDefinition', () => {
    it('should soft delete chore definition by setting isActive to false', async () => {
      const deletedChore = { id: 'chore-1', isActive: false };

      prisma.choreDefinition.update.mockResolvedValue(deletedChore as any);

      const result = await service.deleteChoreDefinition('chore-1');

      expect(result).toEqual(deletedChore);
      expect(prisma.choreDefinition.update).toHaveBeenCalledWith({
        where: { id: 'chore-1' },
        data: { isActive: false },
      });
    });
  });

  describe('getCurrentSchedule', () => {
    it('should return current schedule', async () => {
      const mockSchedule = { id: 'schedule-1', weekId: '2024-W48' };
      const mockFullSchedule = { id: 'schedule-1', weekId: '2024-W48', completions: [] };

      scheduleService.getOrCreateCurrentSchedule.mockResolvedValue(mockSchedule as any);
      scheduleService.getScheduleForWeek.mockResolvedValue(mockFullSchedule as any);

      const result = await service.getCurrentSchedule('unit-1');

      expect(result).toEqual(mockFullSchedule);
      expect(scheduleService.getOrCreateCurrentSchedule).toHaveBeenCalledWith('unit-1');
      expect(scheduleService.getScheduleForWeek).toHaveBeenCalledWith('2024-W48');
    });

    it('should return empty when no schedule exists', async () => {
      scheduleService.getOrCreateCurrentSchedule.mockResolvedValue(null);

      const result = await service.getCurrentSchedule('unit-1');

      expect(result).toEqual({ weekId: null, completions: [] });
    });
  });

  describe('getWeeklyScheduleView', () => {
    it('should return schedule grouped by day', async () => {
      const mockOccupants = [
        {
          id: 'occ-1',
          name: 'John',
          choreDay: 1,
          tenant: { room: { roomNumber: '101' } },
        },
        {
          id: 'occ-2',
          name: 'Jane',
          choreDay: 3,
          tenant: { room: { roomNumber: '102' } },
        },
      ];

      const mockChores = [
        { id: 'chore-1', name: 'Kitchen', description: 'Clean kitchen' },
        { id: 'chore-2', name: 'Bathroom', description: null },
      ];

      prisma.occupant.findMany.mockResolvedValue(mockOccupants as any);
      prisma.choreDefinition.findMany.mockResolvedValue(mockChores as any);

      const result = await service.getWeeklyScheduleView('unit-1');

      expect(result).toHaveLength(7);
      expect(result[0].day).toBe(0);
      expect(result[0].occupants).toHaveLength(0);
      expect(result[1].day).toBe(1);
      expect(result[1].occupants).toHaveLength(1);
      expect(result[1].occupants[0].name).toBe('John');
      expect(result[1].occupants[0].chores).toHaveLength(2);
      expect(result[3].occupants[0].name).toBe('Jane');
    });

    it('should handle occupants without rooms', async () => {
      const mockOccupants = [
        {
          id: 'occ-1',
          name: 'John',
          choreDay: 1,
          tenant: { room: null },
        },
      ];

      prisma.occupant.findMany.mockResolvedValue(mockOccupants as any);
      prisma.choreDefinition.findMany.mockResolvedValue([]);

      const result = await service.getWeeklyScheduleView('unit-1');

      expect(result[1].occupants[0].roomNumber).toBe('N/A');
    });
  });

  describe('getScheduleByWeek', () => {
    it('should return schedule for a given week', async () => {
      const mockSchedule = {
        id: 'schedule-1',
        weekId: '2024-11-25',
        weekStart: new Date('2024-11-25'),
        completions: [],
      };

      scheduleService.getScheduleForWeek.mockResolvedValue(mockSchedule as any);

      const result = await service.getScheduleByWeek('2024-11-25');

      expect(result).toEqual(mockSchedule);
      expect(scheduleService.getScheduleForWeek).toHaveBeenCalledWith('2024-11-25');
    });

    it('should throw NotFoundException when schedule does not exist', async () => {
      scheduleService.getScheduleForWeek.mockResolvedValue(null);

      await expect(service.getScheduleByWeek('2024-11-25')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create schedule when unitId is provided and schedule does not exist', async () => {
      const mockSchedule = { id: 'schedule-1', weekId: '2024-11-25' };

      scheduleService.getScheduleForWeek.mockResolvedValue(null);
      scheduleService.getOrCreateScheduleForWeek.mockResolvedValue(mockSchedule as any);

      const result = await service.getScheduleByWeek('2024-11-25', 'unit-1');

      expect(result).toEqual(mockSchedule);
      expect(scheduleService.getOrCreateScheduleForWeek).toHaveBeenCalledWith(
        '2024-11-25',
        'unit-1',
      );
    });
  });

  describe('markComplete', () => {
    it('should mark a chore as complete with photo', async () => {
      const mockCompletion = {
        id: 'completion-1',
        scheduleId: 'schedule-1',
        choreId: 'chore-1',
        occupantId: 'occupant-1',
        status: 'PENDING',
        completedAt: null,
        photoPath: null,
        photoUploadedAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCompletion = {
        ...mockCompletion,
        status: 'COMPLETED',
        completedAt: new Date(),
        photoPath: 'tenant-1/photo.jpg',
        photoUploadedAt: new Date(),
        occupant: { id: 'occupant-1', name: 'John' },
        chore: { id: 'chore-1', name: 'Kitchen' },
      };

      prisma.choreCompletion.findUnique.mockResolvedValue(mockCompletion as any);
      prisma.choreCompletion.update.mockResolvedValue(updatedCompletion as any);

      const result = await service.markComplete('completion-1', {
        photoPath: 'tenant-1/photo.jpg',
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.photoPath).toBe('tenant-1/photo.jpg');
      expect(prisma.choreCompletion.update).toHaveBeenCalledWith({
        where: { id: 'completion-1' },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          photoPath: 'tenant-1/photo.jpg',
          photoUploadedAt: expect.any(Date),
          notes: undefined,
        },
        include: {
          occupant: true,
          chore: true,
          photos: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });

    it('should throw NotFoundException when completion does not exist', async () => {
      prisma.choreCompletion.findUnique.mockResolvedValue(null);

      await expect(
        service.markComplete('invalid-id', { photoPath: 'photo.jpg' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should mark a chore as complete without photo', async () => {
      const mockCompletion = {
        id: 'completion-1',
        scheduleId: 'schedule-1',
        choreId: 'chore-1',
        occupantId: 'occupant-1',
        status: 'PENDING',
        completedAt: null,
        photoPath: null,
        photoUploadedAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCompletion = {
        ...mockCompletion,
        status: 'COMPLETED',
        completedAt: new Date(),
        occupant: { id: 'occupant-1', name: 'John' },
        chore: { id: 'chore-1', name: 'Kitchen' },
      };

      prisma.choreCompletion.findUnique.mockResolvedValue(mockCompletion as any);
      prisma.choreCompletion.update.mockResolvedValue(updatedCompletion as any);

      const result = await service.markComplete('completion-1', {});

      expect(result.status).toBe('COMPLETED');
      expect(result.photoPath).toBeNull();
      expect(result.photoUploadedAt).toBeNull();
      expect(prisma.choreCompletion.update).toHaveBeenCalledWith({
        where: { id: 'completion-1' },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        },
        include: {
          occupant: true,
          chore: true,
          photos: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });

    it('should mark a chore as complete with notes only', async () => {
      const mockCompletion = {
        id: 'completion-1',
        scheduleId: 'schedule-1',
        choreId: 'chore-1',
        occupantId: 'occupant-1',
        status: 'PENDING',
        completedAt: null,
        photoPath: null,
        photoUploadedAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCompletion = {
        ...mockCompletion,
        status: 'COMPLETED',
        completedAt: new Date(),
        notes: 'Cleaned thoroughly',
        occupant: { id: 'occupant-1', name: 'John' },
        chore: { id: 'chore-1', name: 'Kitchen' },
      };

      prisma.choreCompletion.findUnique.mockResolvedValue(mockCompletion as any);
      prisma.choreCompletion.update.mockResolvedValue(updatedCompletion as any);

      const result = await service.markComplete('completion-1', {
        notes: 'Cleaned thoroughly',
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.notes).toBe('Cleaned thoroughly');
      expect(result.photoPath).toBeNull();
      expect(prisma.choreCompletion.update).toHaveBeenCalledWith({
        where: { id: 'completion-1' },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          notes: 'Cleaned thoroughly',
        },
        include: {
          occupant: true,
          chore: true,
          photos: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });

    it('should mark a chore as complete with multiple photos', async () => {
      const mockCompletion = {
        id: 'completion-1',
        scheduleId: 'schedule-1',
        choreId: 'chore-1',
        occupantId: 'occupant-1',
        status: 'PENDING',
        completedAt: null,
        photoPath: null,
        photoUploadedAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCompletion = {
        ...mockCompletion,
        status: 'COMPLETED',
        completedAt: new Date(),
        occupant: { id: 'occupant-1', name: 'John' },
        chore: { id: 'chore-1', name: 'Kitchen' },
        photos: [
          { id: 'photo-1', photoPath: 'tenant-1/photo1.jpg', sortOrder: 0 },
          { id: 'photo-2', photoPath: 'tenant-1/photo2.jpg', sortOrder: 1 },
        ],
      };

      prisma.choreCompletion.findUnique.mockResolvedValue(mockCompletion as any);

      // Mock transaction
      const mockTx = {
        choreCompletion: {
          update: jest.fn().mockResolvedValue(updatedCompletion),
          findUnique: jest.fn().mockResolvedValue(updatedCompletion),
        },
        choreCompletionPhoto: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      prisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const result = await service.markComplete('completion-1', {
        photoPaths: ['tenant-1/photo1.jpg', 'tenant-1/photo2.jpg'],
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.photos).toHaveLength(2);
      expect(mockTx.choreCompletionPhoto.create).toHaveBeenCalledTimes(2);
      expect(mockTx.choreCompletionPhoto.create).toHaveBeenCalledWith({
        data: {
          completionId: 'completion-1',
          photoPath: 'tenant-1/photo1.jpg',
          sortOrder: 0,
        },
      });
      expect(mockTx.choreCompletionPhoto.create).toHaveBeenCalledWith({
        data: {
          completionId: 'completion-1',
          photoPath: 'tenant-1/photo2.jpg',
          sortOrder: 1,
        },
      });
    });

    it('should reject more than 3 photos', async () => {
      const mockCompletion = {
        id: 'completion-1',
        status: 'PENDING',
      };

      prisma.choreCompletion.findUnique.mockResolvedValue(mockCompletion as any);

      await expect(
        service.markComplete('completion-1', {
          photoPaths: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCompletionHistory', () => {
    it('should return completion history for an occupant', async () => {
      const mockHistory = [
        {
          id: 'completion-1',
          status: 'COMPLETED',
          chore: { name: 'Kitchen' },
          schedule: { weekId: '2024-11-25' },
        },
      ];

      prisma.choreCompletion.findMany.mockResolvedValue(mockHistory as any);

      const result = await service.getCompletionHistory('occupant-1');

      expect(result).toEqual(mockHistory);
      expect(prisma.choreCompletion.findMany).toHaveBeenCalledWith({
        where: { occupantId: 'occupant-1' },
        include: {
          chore: true,
          schedule: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('should respect custom limit', async () => {
      prisma.choreCompletion.findMany.mockResolvedValue([]);

      await service.getCompletionHistory('occupant-1', 5);

      expect(prisma.choreCompletion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('getCompletionStats', () => {
    it('should calculate completion statistics', async () => {
      const mockCompletions = [
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'MISSED' },
        { status: 'PENDING' },
      ];

      prisma.choreCompletion.findMany.mockResolvedValue(mockCompletions as any);

      const result = await service.getCompletionStats('occupant-1');

      expect(result).toEqual({
        total: 4,
        completed: 2,
        missed: 1,
        pending: 1,
        completionRate: 50,
      });
    });

    it('should return 0% completion rate when no completions', async () => {
      prisma.choreCompletion.findMany.mockResolvedValue([]);

      const result = await service.getCompletionStats('occupant-1');

      expect(result.completionRate).toBe(0);
    });
  });

  describe('getTodaysChores', () => {
    it('should return chores when today is chore day', async () => {
      const today = new Date().getDay();
      const mockTenant = {
        id: 'tenant-1',
        occupants: [{ id: 'occupant-1', name: 'John', choreDay: today, isActive: true }],
        room: { unitId: 'unit-1', unit: {} },
      };
      const mockSchedule = { id: 'schedule-1' };
      const mockChores = [
        { id: 'completion-1', chore: { name: 'Kitchen' }, occupant: { name: 'John' } },
      ];

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);
      scheduleService.getOrCreateCurrentSchedule.mockResolvedValue(mockSchedule as any);
      prisma.choreCompletion.findMany.mockResolvedValue(mockChores as any);

      const result = await service.getTodaysChores('tenant-1');

      expect(result.isChoreDay).toBe(true);
      expect(result.occupants).toEqual(mockTenant.occupants);
      expect(result.chores).toEqual(mockChores);
      expect(prisma.choreCompletion.findMany).toHaveBeenCalledWith({
        where: {
          scheduleId: 'schedule-1',
          occupantId: {
            in: ['occupant-1'],
          },
        },
        include: {
          chore: true,
          occupant: true,
        },
        orderBy: [
          { occupant: { name: 'asc' } },
          { chore: { sortOrder: 'asc' } },
        ],
      });
    });

    it('should return chores for multiple occupants on same day', async () => {
      const today = new Date().getDay();
      const mockTenant = {
        id: 'tenant-1',
        occupants: [
          { id: 'occupant-1', name: 'John', choreDay: today, isActive: true },
          { id: 'occupant-2', name: 'Jane', choreDay: today, isActive: true },
        ],
        room: { unitId: 'unit-1', unit: {} },
      };
      const mockSchedule = { id: 'schedule-1' };
      const mockChores = [
        { id: 'completion-1', chore: { name: 'Kitchen' }, occupant: { name: 'Jane' } },
        { id: 'completion-2', chore: { name: 'Bathroom' }, occupant: { name: 'John' } },
      ];

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);
      scheduleService.getOrCreateCurrentSchedule.mockResolvedValue(mockSchedule as any);
      prisma.choreCompletion.findMany.mockResolvedValue(mockChores as any);

      const result = await service.getTodaysChores('tenant-1');

      expect(result.isChoreDay).toBe(true);
      expect(result.occupants).toEqual(mockTenant.occupants);
      expect(result.chores).toEqual(mockChores);
      expect(prisma.choreCompletion.findMany).toHaveBeenCalledWith({
        where: {
          scheduleId: 'schedule-1',
          occupantId: {
            in: ['occupant-1', 'occupant-2'],
          },
        },
        include: {
          chore: true,
          occupant: true,
        },
        orderBy: [
          { occupant: { name: 'asc' } },
          { chore: { sortOrder: 'asc' } },
        ],
      });
    });

    it('should return empty when not chore day', async () => {
      const notToday = (new Date().getDay() + 1) % 7;
      const mockTenant = {
        id: 'tenant-1',
        occupants: [{ id: 'occupant-1', name: 'John', choreDay: notToday, isActive: true }],
        room: { unitId: 'unit-1', unit: {} },
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);

      const result = await service.getTodaysChores('tenant-1');

      expect(result.isChoreDay).toBe(false);
      expect(result.occupants).toEqual([]);
      expect(result.chores).toEqual([]);
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getTodaysChores('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty chores when tenant has no room', async () => {
      const today = new Date().getDay();
      const mockTenant = {
        id: 'tenant-1',
        occupants: [{ id: 'occupant-1', name: 'John', choreDay: today, isActive: true }],
        room: null,
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);

      const result = await service.getTodaysChores('tenant-1');

      expect(result.isChoreDay).toBe(true);
      expect(result.occupants).toEqual(mockTenant.occupants);
      expect(result.chores).toEqual([]);
    });

    it('should return empty chores when no schedule exists', async () => {
      const today = new Date().getDay();
      const mockTenant = {
        id: 'tenant-1',
        occupants: [{ id: 'occupant-1', name: 'John', choreDay: today, isActive: true }],
        room: { unitId: 'unit-1', unit: {} },
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);
      scheduleService.getOrCreateCurrentSchedule.mockResolvedValue(null);

      const result = await service.getTodaysChores('tenant-1');

      expect(result.isChoreDay).toBe(true);
      expect(result.occupants).toEqual(mockTenant.occupants);
      expect(result.chores).toEqual([]);
    });
  });
});
