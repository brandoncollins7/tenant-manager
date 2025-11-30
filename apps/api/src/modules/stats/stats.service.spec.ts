import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('StatsService', () => {
  let service: StatsService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
    prisma = module.get(PrismaService);
  });

  describe('getOccupantStats', () => {
    it('should return stats for an occupant with completions', async () => {
      const mockCompletions = [
        { id: 'c1', status: 'COMPLETED', completedAt: new Date() },
        { id: 'c2', status: 'COMPLETED', completedAt: new Date() },
        { id: 'c3', status: 'MISSED', completedAt: null },
        { id: 'c4', status: 'PENDING', completedAt: null },
      ];

      const mockRecentCompletions = [
        { id: 'c1', chore: { name: 'Kitchen' }, schedule: {} },
        { id: 'c2', chore: { name: 'Bathroom' }, schedule: {} },
      ];

      prisma.choreCompletion.findMany
        .mockResolvedValueOnce(mockCompletions as any)
        .mockResolvedValueOnce(mockRecentCompletions as any);

      const result = await service.getOccupantStats('occupant-1');

      expect(result).toEqual({
        total: 4,
        completed: 2,
        missed: 1,
        pending: 1,
        completionRate: 50,
        recentCompletions: mockRecentCompletions,
      });
    });

    it('should return 0% completion rate when no completions exist', async () => {
      prisma.choreCompletion.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getOccupantStats('occupant-1');

      expect(result).toEqual({
        total: 0,
        completed: 0,
        missed: 0,
        pending: 0,
        completionRate: 0,
        recentCompletions: [],
      });
    });

    it('should calculate correct completion rate', async () => {
      const mockCompletions = [
        { id: 'c1', status: 'COMPLETED' },
        { id: 'c2', status: 'COMPLETED' },
        { id: 'c3', status: 'COMPLETED' },
        { id: 'c4', status: 'MISSED' },
      ];

      prisma.choreCompletion.findMany
        .mockResolvedValueOnce(mockCompletions as any)
        .mockResolvedValueOnce([]);

      const result = await service.getOccupantStats('occupant-1');

      expect(result.completionRate).toBe(75);
    });
  });

  describe('getUnitStats', () => {
    it('should return unit stats with leaderboard', async () => {
      const mockOccupants = [
        {
          id: 'occ-1',
          name: 'John',
          choreDay: 1,
          tenant: { room: { roomNumber: '101' } },
          choreCompletions: [
            { status: 'COMPLETED' },
            { status: 'COMPLETED' },
          ],
        },
        {
          id: 'occ-2',
          name: 'Jane',
          choreDay: 2,
          tenant: { room: { roomNumber: '102' } },
          choreCompletions: [
            { status: 'COMPLETED' },
            { status: 'MISSED' },
          ],
        },
      ];

      prisma.occupant.findMany.mockResolvedValue(mockOccupants as any);

      const result = await service.getUnitStats('unit-1');

      expect(result.totalOccupants).toBe(2);
      expect(result.totalChores).toBe(4);
      expect(result.completedChores).toBe(3);
      expect(result.missedChores).toBe(1);
      expect(result.overallCompletionRate).toBe(75);
      expect(result.leaderboard).toHaveLength(2);
      expect(result.leaderboard[0].name).toBe('John');
      expect(result.leaderboard[0].completionRate).toBe(100);
      expect(result.leaderboard[1].name).toBe('Jane');
      expect(result.leaderboard[1].completionRate).toBe(50);
    });

    it('should return empty stats when no occupants', async () => {
      prisma.occupant.findMany.mockResolvedValue([]);

      const result = await service.getUnitStats('unit-1');

      expect(result).toEqual({
        totalOccupants: 0,
        totalChores: 0,
        completedChores: 0,
        missedChores: 0,
        overallCompletionRate: 0,
        leaderboard: [],
      });
    });

    it('should filter out occupants without rooms in leaderboard', async () => {
      const mockOccupants = [
        {
          id: 'occ-1',
          name: 'John',
          choreDay: 1,
          tenant: { room: { roomNumber: '101' } },
          choreCompletions: [{ status: 'COMPLETED' }],
        },
        {
          id: 'occ-2',
          name: 'Jane',
          choreDay: 2,
          tenant: { room: null },
          choreCompletions: [{ status: 'COMPLETED' }],
        },
      ];

      prisma.occupant.findMany.mockResolvedValue(mockOccupants as any);

      const result = await service.getUnitStats('unit-1');

      expect(result.leaderboard).toHaveLength(1);
      expect(result.leaderboard[0].name).toBe('John');
    });

    it('should sort leaderboard by completion rate descending', async () => {
      const mockOccupants = [
        {
          id: 'occ-1',
          name: 'Low Performer',
          choreDay: 1,
          tenant: { room: { roomNumber: '101' } },
          choreCompletions: [{ status: 'MISSED' }, { status: 'MISSED' }],
        },
        {
          id: 'occ-2',
          name: 'High Performer',
          choreDay: 2,
          tenant: { room: { roomNumber: '102' } },
          choreCompletions: [{ status: 'COMPLETED' }, { status: 'COMPLETED' }],
        },
        {
          id: 'occ-3',
          name: 'Mid Performer',
          choreDay: 3,
          tenant: { room: { roomNumber: '103' } },
          choreCompletions: [{ status: 'COMPLETED' }, { status: 'MISSED' }],
        },
      ];

      prisma.occupant.findMany.mockResolvedValue(mockOccupants as any);

      const result = await service.getUnitStats('unit-1');

      expect(result.leaderboard[0].name).toBe('High Performer');
      expect(result.leaderboard[0].completionRate).toBe(100);
      expect(result.leaderboard[1].name).toBe('Mid Performer');
      expect(result.leaderboard[1].completionRate).toBe(50);
      expect(result.leaderboard[2].name).toBe('Low Performer');
      expect(result.leaderboard[2].completionRate).toBe(0);
    });
  });
});
