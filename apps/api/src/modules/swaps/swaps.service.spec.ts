import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SwapsService } from './swaps.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('SwapsService', () => {
  let service: SwapsService;
  let prisma: DeepMockProxy<PrismaClient>;
  let notificationsService: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SwapsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        {
          provide: NotificationsService,
          useValue: {
            createSwapRequestNotification: jest.fn(),
            createSwapResponseNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SwapsService>(SwapsService);
    prisma = module.get(PrismaService);
    notificationsService = module.get(NotificationsService);
  });

  describe('create', () => {
    it('should create a swap request and notify target', async () => {
      const mockRequester = {
        id: 'requester-1',
        name: 'John',
        tenant: { id: 'tenant-1' },
      };
      const mockTarget = {
        id: 'target-1',
        name: 'Jane',
        tenant: { id: 'tenant-2' },
      };
      const mockSchedule = { id: 'schedule-1', weekId: '2024-11-25' };
      const mockSwapRequest = {
        id: 'swap-1',
        requesterId: 'requester-1',
        targetId: 'target-1',
        scheduleId: 'schedule-1',
        status: 'PENDING',
        requester: mockRequester,
        target: mockTarget,
        schedule: mockSchedule,
      };

      prisma.occupant.findUnique
        .mockResolvedValueOnce(mockRequester as any)
        .mockResolvedValueOnce(mockTarget as any);
      prisma.choreSchedule.findUnique.mockResolvedValue(mockSchedule as any);
      prisma.swapRequest.findFirst.mockResolvedValue(null);
      prisma.swapRequest.create.mockResolvedValue(mockSwapRequest as any);

      const result = await service.create('requester-1', {
        targetId: 'target-1',
        weekId: '2024-11-25',
      });

      expect(result).toEqual(mockSwapRequest);
      expect(notificationsService.createSwapRequestNotification).toHaveBeenCalledWith(
        'tenant-2',
        'John',
        'Jane',
        '2024-11-25',
      );
    });

    it('should throw NotFoundException when requester does not exist', async () => {
      prisma.occupant.findUnique.mockResolvedValue(null);

      await expect(
        service.create('invalid-id', { targetId: 'target-1', weekId: '2024-11-25' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when schedule does not exist', async () => {
      const mockOccupant = { id: 'occupant-1', tenant: { id: 'tenant-1' } };
      prisma.occupant.findUnique.mockResolvedValue(mockOccupant as any);
      prisma.choreSchedule.findUnique.mockResolvedValue(null);

      await expect(
        service.create('requester-1', { targetId: 'target-1', weekId: '2024-11-25' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when duplicate request exists', async () => {
      const mockOccupant = { id: 'occupant-1', tenant: { id: 'tenant-1' } };
      const mockSchedule = { id: 'schedule-1' };
      const existingRequest = { id: 'existing-swap', status: 'PENDING' };

      prisma.occupant.findUnique.mockResolvedValue(mockOccupant as any);
      prisma.choreSchedule.findUnique.mockResolvedValue(mockSchedule as any);
      prisma.swapRequest.findFirst.mockResolvedValue(existingRequest as any);

      await expect(
        service.create('requester-1', { targetId: 'target-1', weekId: '2024-11-25' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all swap requests for an occupant', async () => {
      const mockRequests = [
        { id: 'swap-1', requesterId: 'occupant-1' },
        { id: 'swap-2', targetId: 'occupant-1' },
      ];

      prisma.swapRequest.findMany.mockResolvedValue(mockRequests as any);

      const result = await service.findAll('occupant-1');

      expect(result).toEqual(mockRequests);
      expect(prisma.swapRequest.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ requesterId: 'occupant-1' }, { targetId: 'occupant-1' }],
        },
        include: {
          requester: true,
          target: true,
          schedule: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('respond', () => {
    it('should approve a swap request and swap completions', async () => {
      const mockSwapRequest = {
        id: 'swap-1',
        status: 'PENDING',
        requesterId: 'requester-1',
        targetId: 'target-1',
        scheduleId: 'schedule-1',
        requester: { id: 'requester-1', name: 'John', tenant: { id: 'tenant-1' } },
        target: { id: 'target-1', name: 'Jane', tenant: { id: 'tenant-2' } },
        schedule: { id: 'schedule-1' },
      };

      prisma.swapRequest.findUnique
        .mockResolvedValueOnce(mockSwapRequest as any)
        .mockResolvedValueOnce({ ...mockSwapRequest, status: 'APPROVED' } as any);
      prisma.$transaction.mockResolvedValue([]);

      const result = await service.respond('swap-1', { approved: true });

      expect(result!.status).toBe('APPROVED');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(notificationsService.createSwapResponseNotification).toHaveBeenCalledWith(
        'tenant-1',
        'Jane',
        true,
      );
    });

    it('should reject a swap request', async () => {
      const mockSwapRequest = {
        id: 'swap-1',
        status: 'PENDING',
        requesterId: 'requester-1',
        targetId: 'target-1',
        requester: { id: 'requester-1', name: 'John', tenant: { id: 'tenant-1' } },
        target: { id: 'target-1', name: 'Jane', tenant: { id: 'tenant-2' } },
      };

      prisma.swapRequest.findUnique
        .mockResolvedValueOnce(mockSwapRequest as any)
        .mockResolvedValueOnce({ ...mockSwapRequest, status: 'REJECTED' } as any);
      prisma.swapRequest.update.mockResolvedValue({ ...mockSwapRequest, status: 'REJECTED' } as any);

      const result = await service.respond('swap-1', { approved: false });

      expect(result!.status).toBe('REJECTED');
      expect(notificationsService.createSwapResponseNotification).toHaveBeenCalledWith(
        'tenant-1',
        'Jane',
        false,
      );
    });

    it('should throw NotFoundException when swap request does not exist', async () => {
      prisma.swapRequest.findUnique.mockResolvedValue(null);

      await expect(service.respond('invalid-id', { approved: true })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when swap is not pending', async () => {
      const mockSwapRequest = {
        id: 'swap-1',
        status: 'APPROVED',
      };

      prisma.swapRequest.findUnique.mockResolvedValue(mockSwapRequest as any);

      await expect(service.respond('swap-1', { approved: true })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a pending swap request', async () => {
      const mockSwapRequest = {
        id: 'swap-1',
        requesterId: 'requester-1',
        status: 'PENDING',
      };

      prisma.swapRequest.findUnique.mockResolvedValue(mockSwapRequest as any);
      prisma.swapRequest.update.mockResolvedValue({ ...mockSwapRequest, status: 'CANCELLED' } as any);

      const result = await service.cancel('swap-1', 'requester-1');

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw NotFoundException when swap request does not exist', async () => {
      prisma.swapRequest.findUnique.mockResolvedValue(null);

      await expect(service.cancel('invalid-id', 'requester-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when not the requester', async () => {
      const mockSwapRequest = {
        id: 'swap-1',
        requesterId: 'requester-1',
        status: 'PENDING',
      };

      prisma.swapRequest.findUnique.mockResolvedValue(mockSwapRequest as any);

      await expect(service.cancel('swap-1', 'different-user')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when not pending', async () => {
      const mockSwapRequest = {
        id: 'swap-1',
        requesterId: 'requester-1',
        status: 'APPROVED',
      };

      prisma.swapRequest.findUnique.mockResolvedValue(mockSwapRequest as any);

      await expect(service.cancel('swap-1', 'requester-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
