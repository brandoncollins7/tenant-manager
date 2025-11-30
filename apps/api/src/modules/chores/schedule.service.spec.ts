import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    prisma = module.get(PrismaService);
  });

  describe('getWeekId', () => {
    it('should return correct week ID format', () => {
      const date = new Date(2025, 0, 6, 12, 0, 0); // Monday, Jan 6 2025 noon local
      const result = service.getWeekId(date);
      expect(result).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('should return same week ID for all days in the same week', () => {
      const monday = new Date(2025, 5, 2, 12, 0, 0); // Monday June 2
      const wednesday = new Date(2025, 5, 4, 12, 0, 0); // Wednesday June 4
      const sunday = new Date(2025, 5, 8, 12, 0, 0); // Sunday June 8

      const mondayWeekId = service.getWeekId(monday);
      const wednesdayWeekId = service.getWeekId(wednesday);
      const sundayWeekId = service.getWeekId(sunday);

      expect(mondayWeekId).toBe(wednesdayWeekId);
      expect(wednesdayWeekId).toBe(sundayWeekId);
    });

    it('should return different week IDs for different weeks', () => {
      const week1 = new Date(2025, 5, 2, 12, 0, 0); // Monday June 2
      const week2 = new Date(2025, 5, 9, 12, 0, 0); // Monday June 9

      const week1Id = service.getWeekId(week1);
      const week2Id = service.getWeekId(week2);

      expect(week1Id).not.toBe(week2Id);
    });
  });

  describe('getWeekStart', () => {
    it('should return Monday for any day of the week', () => {
      const wednesday = new Date(2025, 5, 4, 15, 30, 0); // Wednesday June 4
      const result = service.getWeekStart(wednesday);

      expect(result.getDay()).toBe(1); // Monday
    });

    it('should return same Monday for a Monday input', () => {
      const monday = new Date(2025, 5, 2, 12, 0, 0); // Monday June 2
      const result = service.getWeekStart(monday);

      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(2);
    });

    it('should handle Sunday correctly (previous Monday)', () => {
      const sunday = new Date(2025, 5, 8, 12, 0, 0); // Sunday June 8
      const result = service.getWeekStart(sunday);

      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(2); // Monday June 2
    });

    it('should set time to midnight', () => {
      const dateWithTime = new Date('2025-01-08T15:30:45');
      const result = service.getWeekStart(dateWithTime);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe('parseWeekId', () => {
    it('should parse week ID and return Monday of that week', () => {
      const result = service.parseWeekId('2025-W02');

      expect(result.getDay()).toBe(1); // Monday
      expect(result.getFullYear()).toBe(2025);
    });

    it('should set time to midnight', () => {
      const result = service.parseWeekId('2025-W02');

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe('generateScheduleForUnit', () => {
    const mockUnit = {
      id: 'unit-1',
      chores: [{ id: 'chore-1' }, { id: 'chore-2' }],
      rooms: [
        { tenant: { occupants: [{ id: 'occ-1' }, { id: 'occ-2' }] } },
        { tenant: { occupants: [{ id: 'occ-3' }] } },
      ],
    };

    it('should return existing schedule if it already exists', async () => {
      const existingSchedule = { id: 'schedule-1', weekId: '2025-W02' };
      prisma.choreSchedule.findUnique.mockResolvedValue(existingSchedule as any);

      const result = await service.generateScheduleForUnit(
        mockUnit as any,
        '2025-W02',
        new Date('2025-01-06'),
      );

      expect(result).toEqual(existingSchedule);
      expect(prisma.choreSchedule.create).not.toHaveBeenCalled();
    });

    it('should create new schedule with completions when none exists', async () => {
      const newSchedule = { id: 'schedule-new', weekId: '2025-W02' };

      prisma.choreSchedule.findUnique.mockResolvedValue(null);
      prisma.choreSchedule.create.mockResolvedValue(newSchedule as any);
      prisma.choreCompletion.createMany.mockResolvedValue({ count: 6 });

      const result = await service.generateScheduleForUnit(
        mockUnit as any,
        '2025-W02',
        new Date('2025-01-06'),
      );

      expect(result).toEqual(newSchedule);
      expect(prisma.choreSchedule.create).toHaveBeenCalledWith({
        data: {
          weekId: '2025-W02',
          weekStart: new Date('2025-01-06'),
        },
      });
      // 3 occupants × 2 chores = 6 completions
      expect(prisma.choreCompletion.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ occupantId: 'occ-1', choreId: 'chore-1' }),
          expect.objectContaining({ occupantId: 'occ-1', choreId: 'chore-2' }),
        ]),
      });
    });

    it('should handle unit with no occupants', async () => {
      const unitNoOccupants = {
        id: 'unit-1',
        chores: [{ id: 'chore-1' }],
        rooms: [{ tenant: null }, { tenant: { occupants: [] } }],
      };

      prisma.choreSchedule.findUnique.mockResolvedValue(null);
      prisma.choreSchedule.create.mockResolvedValue({ id: 'schedule-1' } as any);

      await service.generateScheduleForUnit(
        unitNoOccupants as any,
        '2025-W02',
        new Date('2025-01-06'),
      );

      expect(prisma.choreCompletion.createMany).not.toHaveBeenCalled();
    });
  });

  describe('getScheduleForWeek', () => {
    it('should return schedule with completions', async () => {
      const mockSchedule = {
        id: 'schedule-1',
        weekId: '2025-W02',
        completions: [
          { id: 'c1', occupant: { tenant: { room: {} } }, chore: {} },
        ],
      };

      prisma.choreSchedule.findUnique.mockResolvedValue(mockSchedule as any);

      const result = await service.getScheduleForWeek('2025-W02');

      expect(result).toEqual(mockSchedule);
      expect(prisma.choreSchedule.findUnique).toHaveBeenCalledWith({
        where: { weekId: '2025-W02' },
        include: {
          completions: {
            include: {
              occupant: {
                include: {
                  tenant: {
                    include: { room: true },
                  },
                },
              },
              chore: true,
            },
            orderBy: [{ occupant: { choreDay: 'asc' } }, { chore: { sortOrder: 'asc' } }],
          },
        },
      });
    });

    it('should return null when schedule does not exist', async () => {
      prisma.choreSchedule.findUnique.mockResolvedValue(null);

      const result = await service.getScheduleForWeek('2025-W99');

      expect(result).toBeNull();
    });
  });

  describe('getOrCreateCurrentSchedule', () => {
    it('should return existing schedule when found', async () => {
      const existingSchedule = { id: 'schedule-1', weekId: '2025-W02' };
      prisma.choreSchedule.findUnique.mockResolvedValue(existingSchedule as any);

      const result = await service.getOrCreateCurrentSchedule('unit-1');

      expect(result).toEqual(existingSchedule);
      expect(prisma.unit.findUnique).not.toHaveBeenCalled();
    });

    it('should create schedule when none exists', async () => {
      const mockUnit = {
        id: 'unit-1',
        chores: [{ id: 'chore-1' }],
        rooms: [{ tenant: { isActive: true, occupants: [{ id: 'occ-1' }] } }],
      };
      const newSchedule = { id: 'schedule-new' };

      prisma.choreSchedule.findUnique
        .mockResolvedValueOnce(null) // First check
        .mockResolvedValueOnce(null); // generateScheduleForUnit check
      prisma.unit.findUnique.mockResolvedValue(mockUnit as any);
      prisma.choreSchedule.create.mockResolvedValue(newSchedule as any);

      const result = await service.getOrCreateCurrentSchedule('unit-1');

      expect(result).toEqual(newSchedule);
    });

    it('should filter out inactive tenants', async () => {
      const mockUnit = {
        id: 'unit-1',
        chores: [{ id: 'chore-1' }],
        rooms: [
          { tenant: { isActive: true, occupants: [{ id: 'occ-1' }] } },
          { tenant: { isActive: false, occupants: [{ id: 'occ-2' }] } },
        ],
      };

      prisma.choreSchedule.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.unit.findUnique.mockResolvedValue(mockUnit as any);
      prisma.choreSchedule.create.mockResolvedValue({ id: 'schedule-1' } as any);
      prisma.choreCompletion.createMany.mockResolvedValue({ count: 1 });

      await service.getOrCreateCurrentSchedule('unit-1');

      // Should only create completion for active tenant's occupant
      expect(prisma.choreCompletion.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ occupantId: 'occ-1' })],
      });
    });
  });

  describe('getOrCreateScheduleForWeek', () => {
    it('should return existing schedule when found', async () => {
      const existingSchedule = { id: 'schedule-1', weekId: '2025-W02' };
      prisma.choreSchedule.findUnique.mockResolvedValue(existingSchedule as any);

      const result = await service.getOrCreateScheduleForWeek('2025-W02', 'unit-1');

      expect(result).toEqual(existingSchedule);
    });

    it('should create and fetch schedule when none exists', async () => {
      const mockUnit = {
        id: 'unit-1',
        chores: [{ id: 'chore-1' }],
        rooms: [{ tenant: { isActive: true, occupants: [{ id: 'occ-1' }] } }],
      };
      const newSchedule = { id: 'schedule-new', weekId: '2025-W02' };

      prisma.choreSchedule.findUnique
        .mockResolvedValueOnce(null) // getScheduleForWeek first call
        .mockResolvedValueOnce(null) // generateScheduleForUnit check
        .mockResolvedValueOnce(newSchedule as any); // getScheduleForWeek after creation
      prisma.unit.findUnique.mockResolvedValue(mockUnit as any);
      prisma.choreSchedule.create.mockResolvedValue(newSchedule as any);

      const result = await service.getOrCreateScheduleForWeek('2025-W02', 'unit-1');

      expect(result).toEqual(newSchedule);
    });
  });

  describe('redistributeChores', () => {
    it('should create temp assignment for removed occupant day', async () => {
      const activeOccupants = [
        { id: 'occ-1', choreDay: 1 },
        { id: 'occ-2', choreDay: 3 },
      ];

      prisma.occupant.findMany.mockResolvedValue(activeOccupants as any);
      prisma.tempAssignment.create.mockResolvedValue({} as any);

      await service.redistributeChores('unit-1', 2);

      expect(prisma.tempAssignment.create).toHaveBeenCalledWith({
        data: {
          occupantId: 'occ-1',
          originalDay: 2,
          weekId: expect.any(String),
          reason: 'Covering for departed tenant',
        },
      });
    });

    it('should not create assignment when no active occupants', async () => {
      prisma.occupant.findMany.mockResolvedValue([]);

      await service.redistributeChores('unit-1', 2);

      expect(prisma.tempAssignment.create).not.toHaveBeenCalled();
    });
  });

  describe('generateWeeklySchedules', () => {
    it('should generate schedules for all units', async () => {
      const mockUnits = [
        {
          id: 'unit-1',
          chores: [{ id: 'chore-1' }],
          rooms: [{ tenant: { isActive: true, occupants: [{ id: 'occ-1' }] } }],
        },
      ];

      prisma.unit.findMany.mockResolvedValue(mockUnits as any);
      prisma.choreSchedule.findUnique.mockResolvedValue(null);
      prisma.choreSchedule.create.mockResolvedValue({ id: 'schedule-1' } as any);
      prisma.choreCompletion.createMany.mockResolvedValue({ count: 1 });

      await service.generateWeeklySchedules();

      expect(prisma.unit.findMany).toHaveBeenCalled();
      expect(prisma.choreSchedule.create).toHaveBeenCalled();
    });

    it('should filter inactive tenants when generating schedules', async () => {
      const mockUnits = [
        {
          id: 'unit-1',
          chores: [{ id: 'chore-1' }],
          rooms: [
            { tenant: { isActive: false, occupants: [{ id: 'occ-1' }] } },
          ],
        },
      ];

      prisma.unit.findMany.mockResolvedValue(mockUnits as any);
      prisma.choreSchedule.findUnique.mockResolvedValue(null);
      prisma.choreSchedule.create.mockResolvedValue({ id: 'schedule-1' } as any);

      await service.generateWeeklySchedules();

      // No completions should be created since tenant is inactive
      expect(prisma.choreCompletion.createMany).not.toHaveBeenCalled();
    });
  });
});
