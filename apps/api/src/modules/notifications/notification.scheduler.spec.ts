import { Test, TestingModule } from '@nestjs/testing';
import { NotificationScheduler } from './notification.scheduler';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('NotificationScheduler', () => {
  let scheduler: NotificationScheduler;
  let prisma: DeepMockProxy<PrismaClient>;
  let emailService: jest.Mocked<EmailService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationScheduler,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        {
          provide: NotificationsService,
          useValue: {
            createChoreReminderNotification: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendDailyChoreReport: jest.fn(),
          },
        },
      ],
    }).compile();

    scheduler = module.get<NotificationScheduler>(NotificationScheduler);
    prisma = module.get(PrismaService);
    emailService = module.get(EmailService);
    notificationsService = module.get(NotificationsService);
  });

  describe('sendDailyAdminReports', () => {
    it('should send reports to admins for units with chores due today', async () => {
      const mockUnits = [
        {
          id: 'unit-1',
          name: 'Building A',
          adminAssignments: [
            {
              admin: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User' },
            },
          ],
        },
      ];

      const mockCompletions = [
        {
          id: 'completion-1',
          status: 'COMPLETED',
          completedAt: new Date('2025-11-28T14:30:00'),
          occupant: { id: 'occupant-1', name: 'John Smith', choreDay: 5 },
          chore: { id: 'chore-1', name: 'Kitchen Cleaning', unitId: 'unit-1' },
        },
        {
          id: 'completion-2',
          status: 'MISSED',
          completedAt: null,
          occupant: { id: 'occupant-2', name: 'Jane Doe', choreDay: 5 },
          chore: { id: 'chore-2', name: 'Bathroom Cleaning', unitId: 'unit-1' },
        },
      ];

      prisma.unit.findMany.mockResolvedValue(mockUnits as any);
      prisma.choreCompletion.findMany.mockResolvedValue(mockCompletions as any);

      await scheduler.sendDailyAdminReports();

      expect(prisma.unit.findMany).toHaveBeenCalledWith({
        include: {
          adminAssignments: { include: { admin: true } },
        },
      });

      expect(emailService.sendDailyChoreReport).toHaveBeenCalledWith(
        'admin@example.com',
        'Admin User',
        'Building A',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            occupantName: 'John Smith',
            choreName: 'Kitchen Cleaning',
            status: 'COMPLETED',
          }),
          expect.objectContaining({
            occupantName: 'Jane Doe',
            choreName: 'Bathroom Cleaning',
            status: 'MISSED',
          }),
        ]),
      );
    });

    it('should skip units with no admin assignments', async () => {
      const mockUnits = [
        {
          id: 'unit-1',
          name: 'Building A',
          adminAssignments: [],
        },
      ];

      prisma.unit.findMany.mockResolvedValue(mockUnits as any);

      await scheduler.sendDailyAdminReports();

      expect(prisma.choreCompletion.findMany).not.toHaveBeenCalled();
      expect(emailService.sendDailyChoreReport).not.toHaveBeenCalled();
    });

    it('should skip units with no chores due today', async () => {
      const mockUnits = [
        {
          id: 'unit-1',
          name: 'Building A',
          adminAssignments: [
            {
              admin: { id: 'admin-1', email: 'admin@example.com', name: 'Admin User' },
            },
          ],
        },
      ];

      prisma.unit.findMany.mockResolvedValue(mockUnits as any);
      prisma.choreCompletion.findMany.mockResolvedValue([]);

      await scheduler.sendDailyAdminReports();

      expect(emailService.sendDailyChoreReport).not.toHaveBeenCalled();
    });

    it('should send separate emails to multiple admins for the same unit', async () => {
      const mockUnits = [
        {
          id: 'unit-1',
          name: 'Building A',
          adminAssignments: [
            {
              admin: { id: 'admin-1', email: 'admin1@example.com', name: 'Admin One' },
            },
            {
              admin: { id: 'admin-2', email: 'admin2@example.com', name: 'Admin Two' },
            },
          ],
        },
      ];

      const mockCompletions = [
        {
          id: 'completion-1',
          status: 'COMPLETED',
          completedAt: new Date(),
          occupant: { id: 'occupant-1', name: 'John Smith', choreDay: 5 },
          chore: { id: 'chore-1', name: 'Kitchen Cleaning', unitId: 'unit-1' },
        },
      ];

      prisma.unit.findMany.mockResolvedValue(mockUnits as any);
      prisma.choreCompletion.findMany.mockResolvedValue(mockCompletions as any);

      await scheduler.sendDailyAdminReports();

      expect(emailService.sendDailyChoreReport).toHaveBeenCalledTimes(2);
      expect(emailService.sendDailyChoreReport).toHaveBeenCalledWith(
        'admin1@example.com',
        'Admin One',
        'Building A',
        expect.any(String),
        expect.any(Array),
      );
      expect(emailService.sendDailyChoreReport).toHaveBeenCalledWith(
        'admin2@example.com',
        'Admin Two',
        'Building A',
        expect.any(String),
        expect.any(Array),
      );
    });

    it('should handle multiple units with different admins', async () => {
      const mockUnits = [
        {
          id: 'unit-1',
          name: 'Building A',
          adminAssignments: [
            {
              admin: { id: 'admin-1', email: 'admin1@example.com', name: 'Admin One' },
            },
          ],
        },
        {
          id: 'unit-2',
          name: 'Building B',
          adminAssignments: [
            {
              admin: { id: 'admin-2', email: 'admin2@example.com', name: 'Admin Two' },
            },
          ],
        },
      ];

      const mockCompletionsUnit1 = [
        {
          id: 'completion-1',
          status: 'COMPLETED',
          completedAt: new Date(),
          occupant: { id: 'occupant-1', name: 'John', choreDay: 5 },
          chore: { id: 'chore-1', name: 'Kitchen', unitId: 'unit-1' },
        },
      ];

      const mockCompletionsUnit2 = [
        {
          id: 'completion-2',
          status: 'MISSED',
          completedAt: null,
          occupant: { id: 'occupant-2', name: 'Jane', choreDay: 5 },
          chore: { id: 'chore-2', name: 'Bathroom', unitId: 'unit-2' },
        },
      ];

      prisma.unit.findMany.mockResolvedValue(mockUnits as any);
      prisma.choreCompletion.findMany
        .mockResolvedValueOnce(mockCompletionsUnit1 as any)
        .mockResolvedValueOnce(mockCompletionsUnit2 as any);

      await scheduler.sendDailyAdminReports();

      expect(emailService.sendDailyChoreReport).toHaveBeenCalledTimes(2);
      expect(emailService.sendDailyChoreReport).toHaveBeenCalledWith(
        'admin1@example.com',
        'Admin One',
        'Building A',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ occupantName: 'John', choreName: 'Kitchen' }),
        ]),
      );
      expect(emailService.sendDailyChoreReport).toHaveBeenCalledWith(
        'admin2@example.com',
        'Admin Two',
        'Building B',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ occupantName: 'Jane', choreName: 'Bathroom' }),
        ]),
      );
    });
  });

  describe('sendDailyReminders', () => {
    it('should send reminders to occupants with chores due today', async () => {
      const mockOccupants = [
        {
          id: 'occupant-1',
          name: 'John Smith',
          choreDay: new Date().getDay(),
          isActive: true,
          tenant: { id: 'tenant-1', isActive: true },
        },
      ];

      prisma.occupant.findMany.mockResolvedValue(mockOccupants as any);

      await scheduler.sendDailyReminders();

      expect(notificationsService.createChoreReminderNotification).toHaveBeenCalledWith(
        'tenant-1',
        'John Smith',
        expect.any(String),
      );
    });
  });

  describe('markMissedChores', () => {
    it('should mark pending chores as missed', async () => {
      prisma.choreCompletion.updateMany.mockResolvedValue({ count: 3 });

      await scheduler.markMissedChores();

      expect(prisma.choreCompletion.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          occupant: {
            choreDay: expect.any(Number),
            isActive: true,
          },
          schedule: {
            weekStart: { lte: expect.any(Date) },
          },
        },
        data: { status: 'MISSED' },
      });
    });
  });

  describe('expireOldSwapRequests', () => {
    it('should expire pending swap requests older than 7 days', async () => {
      prisma.swapRequest.updateMany.mockResolvedValue({ count: 2 });

      await scheduler.expireOldSwapRequests();

      expect(prisma.swapRequest.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          createdAt: { lt: expect.any(Date) },
        },
        data: { status: 'EXPIRED' },
      });
    });
  });
});
