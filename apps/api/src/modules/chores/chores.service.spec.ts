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
        },
      });
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
  });
});
