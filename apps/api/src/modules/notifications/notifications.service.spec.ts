import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: DeepMockProxy<PrismaClient>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        {
          provide: EmailService,
          useValue: {
            sendSwapRequest: jest.fn(),
            sendChoreReminder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get(PrismaService);
    emailService = module.get(EmailService);
  });

  describe('create', () => {
    it('should create a notification', async () => {
      const mockNotification = {
        id: 'notification-1',
        tenantId: 'tenant-1',
        type: 'CHORE_REMINDER',
        title: 'Test',
        message: 'Test message',
        isRead: false,
      };

      prisma.notification.create.mockResolvedValue(mockNotification as any);

      const result = await service.create(
        'tenant-1',
        'CHORE_REMINDER',
        'Test',
        'Test message',
      );

      expect(result).toEqual(mockNotification);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          type: 'CHORE_REMINDER',
          title: 'Test',
          message: 'Test message',
          metadata: undefined,
        },
      });
    });

    it('should create a notification with metadata', async () => {
      const metadata = { key: 'value' };
      prisma.notification.create.mockResolvedValue({} as any);

      await service.create(
        'tenant-1',
        'SWAP_REQUEST_RECEIVED',
        'Test',
        'Test message',
        metadata,
      );

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata,
        }),
      });
    });
  });

  describe('findByTenant', () => {
    it('should return all notifications for a tenant', async () => {
      const mockNotifications = [
        { id: 'notification-1', isRead: false },
        { id: 'notification-2', isRead: true },
      ];

      prisma.notification.findMany.mockResolvedValue(mockNotifications as any);

      const result = await service.findByTenant('tenant-1');

      expect(result).toEqual(mockNotifications);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should return only unread notifications when flag is set', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await service.findByTenant('tenant-1', true);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const mockNotification = {
        id: 'notification-1',
        isRead: true,
        readAt: new Date(),
      };

      prisma.notification.update.mockResolvedValue(mockNotification as any);

      const result = await service.markAsRead('notification-1');

      expect(result.isRead).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notification-1' },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      await service.markAllAsRead('tenant-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('tenant-1');

      expect(result).toBe(3);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isRead: false },
      });
    });
  });

  describe('createSwapRequestNotification', () => {
    it('should create notification and send email', async () => {
      const mockTenant = {
        id: 'tenant-1',
        email: 'tenant@example.com',
      };
      const mockNotification = {
        id: 'notification-1',
        type: 'SWAP_REQUEST_RECEIVED',
      };

      prisma.notification.create.mockResolvedValue(mockNotification as any);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);

      const result = await service.createSwapRequestNotification(
        'tenant-1',
        'John',
        'Jane',
        '2024-11-25',
      );

      expect(result).toEqual(mockNotification);
      expect(emailService.sendSwapRequest).toHaveBeenCalledWith(
        'tenant@example.com',
        'John',
        'Jane',
        '2024-11-25',
      );
    });

    it('should not send email when tenant not found', async () => {
      prisma.notification.create.mockResolvedValue({} as any);
      prisma.tenant.findUnique.mockResolvedValue(null);

      await service.createSwapRequestNotification('tenant-1', 'John', 'Jane', '2024-11-25');

      expect(emailService.sendSwapRequest).not.toHaveBeenCalled();
    });
  });

  describe('createSwapResponseNotification', () => {
    it('should create approved notification', async () => {
      prisma.notification.create.mockResolvedValue({} as any);

      await service.createSwapResponseNotification('tenant-1', 'Jane', true);

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'SWAP_REQUEST_APPROVED',
          title: 'Swap Approved',
          message: 'Jane approved your swap request',
        }),
      });
    });

    it('should create rejected notification', async () => {
      prisma.notification.create.mockResolvedValue({} as any);

      await service.createSwapResponseNotification('tenant-1', 'Jane', false);

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'SWAP_REQUEST_REJECTED',
          title: 'Swap Rejected',
          message: 'Jane rejected your swap request',
        }),
      });
    });
  });

  describe('createChoreReminderNotification', () => {
    it('should create notification and send email', async () => {
      const mockTenant = {
        id: 'tenant-1',
        email: 'tenant@example.com',
      };
      const mockNotification = {
        id: 'notification-1',
        type: 'CHORE_REMINDER',
      };

      prisma.notification.create.mockResolvedValue(mockNotification as any);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);

      const result = await service.createChoreReminderNotification(
        'tenant-1',
        'John',
        '2024-11-26',
      );

      expect(result).toEqual(mockNotification);
      expect(emailService.sendChoreReminder).toHaveBeenCalledWith(
        'tenant@example.com',
        'John',
        '2024-11-26',
      );
    });
  });
});
