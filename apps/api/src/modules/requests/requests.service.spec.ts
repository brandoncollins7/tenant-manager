import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConcernsService } from '../concerns/concerns.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, RequestType, RequestStatus } from '@prisma/client';

describe('RequestsService', () => {
  let service: RequestsService;
  let prisma: DeepMockProxy<PrismaClient>;
  let notificationsService: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        {
          provide: NotificationsService,
          useValue: {
            createRequestReceivedNotification: jest.fn(),
            sendRequestEmailToUnitAdmins: jest.fn(),
            createRequestResolvedNotification: jest.fn(),
          },
        },
        {
          provide: ConcernsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
    prisma = module.get(PrismaService);
    notificationsService = module.get(NotificationsService);
  });

  describe('create', () => {
    it('should create a request and send notifications', async () => {
      const mockTenant = {
        id: 'tenant-1',
        email: 'tenant@example.com',
        room: {
          id: 'room-1',
          roomNumber: '101',
          unitId: 'unit-1',
          unit: {
            id: 'unit-1',
            adminEmail: 'admin@example.com',
          },
        },
      };
      const mockRequest = {
        id: 'request-1',
        tenantId: 'tenant-1',
        unitId: 'unit-1',
        type: RequestType.CLEANING_SUPPLIES,
        description: 'Need more paper towels',
        photoPath: null,
        status: RequestStatus.PENDING,
        createdAt: new Date(),
        tenant: mockTenant,
        unit: mockTenant.room.unit,
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);
      prisma.request.create.mockResolvedValue(mockRequest as any);

      const result = await service.create('tenant-1', {
        type: RequestType.CLEANING_SUPPLIES,
        description: 'Need more paper towels',
      });

      expect(result).toEqual(mockRequest);
      expect(prisma.request.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          unitId: 'unit-1',
          type: RequestType.CLEANING_SUPPLIES,
          description: 'Need more paper towels',
          photoPath: undefined,
        },
        include: {
          tenant: {
            include: {
              room: true,
            },
          },
          unit: true,
        },
      });
      expect(notificationsService.createRequestReceivedNotification).toHaveBeenCalledWith(
        'tenant-1',
        RequestType.CLEANING_SUPPLIES,
        'request-1',
      );
      expect(notificationsService.sendRequestEmailToUnitAdmins).toHaveBeenCalledWith(
        'unit-1',
        mockTenant,
        mockRequest,
      );
    });

    it('should create a request with a photo', async () => {
      const mockTenant = {
        id: 'tenant-1',
        room: {
          id: 'room-1',
          unitId: 'unit-1',
          unit: {
            id: 'unit-1',
            adminEmail: 'admin@example.com',
          },
        },
      };
      const mockRequest = {
        id: 'request-1',
        tenantId: 'tenant-1',
        unitId: 'unit-1',
        type: RequestType.MAINTENANCE_ISSUE,
        description: 'Leaking faucet',
        photoPath: 'photos/leak.jpg',
        status: RequestStatus.PENDING,
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);
      prisma.request.create.mockResolvedValue(mockRequest as any);

      const result = await service.create('tenant-1', {
        type: RequestType.MAINTENANCE_ISSUE,
        description: 'Leaking faucet',
        photoPath: 'photos/leak.jpg',
      });

      expect(result.photoPath).toBe('photos/leak.jpg');
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.create('invalid-tenant', {
          type: RequestType.CLEANING_SUPPLIES,
          description: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.request.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when tenant has no room', async () => {
      const mockTenant = {
        id: 'tenant-1',
        room: null,
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);

      await expect(
        service.create('tenant-1', {
          type: RequestType.CLEANING_SUPPLIES,
          description: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.request.create).not.toHaveBeenCalled();
    });

    it('should always send email to unit admins regardless of legacy adminEmail', async () => {
      const mockTenant = {
        id: 'tenant-1',
        room: {
          id: 'room-1',
          unitId: 'unit-1',
          unit: {
            id: 'unit-1',
            adminEmail: null, // No legacy adminEmail configured
          },
        },
      };
      const mockRequest = {
        id: 'request-1',
        tenantId: 'tenant-1',
        unitId: 'unit-1',
        type: RequestType.CLEANING_SUPPLIES,
        description: 'Test',
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);
      prisma.request.create.mockResolvedValue(mockRequest as any);

      await service.create('tenant-1', {
        type: RequestType.CLEANING_SUPPLIES,
        description: 'Test',
      });

      expect(notificationsService.createRequestReceivedNotification).toHaveBeenCalled();
      // Should still call sendRequestEmailToUnitAdmins which handles super admins and assigned managers
      expect(notificationsService.sendRequestEmailToUnitAdmins).toHaveBeenCalledWith(
        'unit-1',
        mockTenant,
        mockRequest,
      );
    });
  });

  describe('findAll', () => {
    it('should return all requests when no filters provided', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          type: RequestType.CLEANING_SUPPLIES,
          status: RequestStatus.PENDING,
        },
        {
          id: 'request-2',
          type: RequestType.MAINTENANCE_ISSUE,
          status: RequestStatus.RESOLVED,
        },
      ];

      prisma.request.findMany.mockResolvedValue(mockRequests as any);

      const result = await service.findAll();

      expect(result).toEqual(mockRequests);
      expect(prisma.request.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          tenant: {
            include: {
              room: true,
            },
          },
          unit: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by tenantId', async () => {
      const mockRequests = [{ id: 'request-1', tenantId: 'tenant-1' }];

      prisma.request.findMany.mockResolvedValue(mockRequests as any);

      await service.findAll({ tenantId: 'tenant-1' });

      expect(prisma.request.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by unitId', async () => {
      const mockRequests = [{ id: 'request-1', unitId: 'unit-1' }];

      prisma.request.findMany.mockResolvedValue(mockRequests as any);

      await service.findAll({ unitId: 'unit-1' });

      expect(prisma.request.findMany).toHaveBeenCalledWith({
        where: { unitId: 'unit-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      const mockRequests = [{ id: 'request-1', status: RequestStatus.PENDING }];

      prisma.request.findMany.mockResolvedValue(mockRequests as any);

      await service.findAll({ status: RequestStatus.PENDING });

      expect(prisma.request.findMany).toHaveBeenCalledWith({
        where: { status: RequestStatus.PENDING },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by type', async () => {
      const mockRequests = [{ id: 'request-1', type: RequestType.MAINTENANCE_ISSUE }];

      prisma.request.findMany.mockResolvedValue(mockRequests as any);

      await service.findAll({ type: RequestType.MAINTENANCE_ISSUE });

      expect(prisma.request.findMany).toHaveBeenCalledWith({
        where: { type: RequestType.MAINTENANCE_ISSUE },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by multiple criteria', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          unitId: 'unit-1',
          status: RequestStatus.PENDING,
          type: RequestType.CLEANING_SUPPLIES,
        },
      ];

      prisma.request.findMany.mockResolvedValue(mockRequests as any);

      await service.findAll({
        unitId: 'unit-1',
        status: RequestStatus.PENDING,
        type: RequestType.CLEANING_SUPPLIES,
      });

      expect(prisma.request.findMany).toHaveBeenCalledWith({
        where: {
          unitId: 'unit-1',
          status: RequestStatus.PENDING,
          type: RequestType.CLEANING_SUPPLIES,
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a request by id', async () => {
      const mockRequest = {
        id: 'request-1',
        type: RequestType.CLEANING_SUPPLIES,
        description: 'Need supplies',
        tenant: {
          id: 'tenant-1',
          room: { id: 'room-1' },
        },
        unit: {
          id: 'unit-1',
        },
      };

      prisma.request.findUnique.mockResolvedValue(mockRequest as any);

      const result = await service.findOne('request-1');

      expect(result).toEqual(mockRequest);
      expect(prisma.request.findUnique).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        include: {
          tenant: {
            include: {
              room: true,
            },
          },
          unit: true,
        },
      });
    });

    it('should throw NotFoundException when request does not exist', async () => {
      prisma.request.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolve', () => {
    it('should resolve a request and notify tenant', async () => {
      const mockRequest = {
        id: 'request-1',
        tenantId: 'tenant-1',
        type: RequestType.MAINTENANCE_ISSUE,
        status: RequestStatus.PENDING,
      };
      const mockUpdatedRequest = {
        ...mockRequest,
        status: RequestStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedBy: 'admin@example.com',
        notes: 'Fixed the leak',
      };

      prisma.request.findUnique.mockResolvedValue(mockRequest as any);
      prisma.request.update.mockResolvedValue(mockUpdatedRequest as any);

      const result = await service.resolve('request-1', 'admin@example.com', {
        notes: 'Fixed the leak',
      });

      expect(result.status).toBe(RequestStatus.RESOLVED);
      expect(prisma.request.update).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        data: {
          status: RequestStatus.RESOLVED,
          resolvedAt: expect.any(Date),
          resolvedBy: 'admin@example.com',
          notes: 'Fixed the leak',
        },
        include: {
          tenant: {
            include: {
              room: true,
            },
          },
          unit: true,
        },
      });
      expect(notificationsService.createRequestResolvedNotification).toHaveBeenCalledWith(
        'tenant-1',
        RequestType.MAINTENANCE_ISSUE,
        'Fixed the leak',
      );
    });

    it('should resolve without notes', async () => {
      const mockRequest = {
        id: 'request-1',
        tenantId: 'tenant-1',
        type: RequestType.CLEANING_SUPPLIES,
        status: RequestStatus.PENDING,
      };
      const mockUpdatedRequest = {
        ...mockRequest,
        status: RequestStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedBy: 'admin@example.com',
        notes: undefined,
      };

      prisma.request.findUnique.mockResolvedValue(mockRequest as any);
      prisma.request.update.mockResolvedValue(mockUpdatedRequest as any);

      await service.resolve('request-1', 'admin@example.com', {});

      expect(notificationsService.createRequestResolvedNotification).toHaveBeenCalledWith(
        'tenant-1',
        RequestType.CLEANING_SUPPLIES,
        undefined,
      );
    });

    it('should throw NotFoundException when request does not exist', async () => {
      prisma.request.findUnique.mockResolvedValue(null);

      await expect(
        service.resolve('invalid-id', 'admin@example.com', {}),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.request.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when request is already resolved', async () => {
      const mockRequest = {
        id: 'request-1',
        status: RequestStatus.RESOLVED,
      };

      prisma.request.findUnique.mockResolvedValue(mockRequest as any);

      await expect(
        service.resolve('request-1', 'admin@example.com', {}),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.request.update).not.toHaveBeenCalled();
    });
  });

  describe('getStatsByUnit', () => {
    it('should return pending and resolved counts', async () => {
      prisma.request.count
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(12); // resolved

      const result = await service.getStatsByUnit('unit-1');

      expect(result).toEqual({ pending: 5, resolved: 12 });
      expect(prisma.request.count).toHaveBeenCalledTimes(2);
      expect(prisma.request.count).toHaveBeenNthCalledWith(1, {
        where: {
          unitId: 'unit-1',
          status: RequestStatus.PENDING,
        },
      });
      expect(prisma.request.count).toHaveBeenNthCalledWith(2, {
        where: {
          unitId: 'unit-1',
          status: RequestStatus.RESOLVED,
        },
      });
    });

    it('should return zero counts when no requests exist', async () => {
      prisma.request.count.mockResolvedValue(0);

      const result = await service.getStatsByUnit('unit-1');

      expect(result).toEqual({ pending: 0, resolved: 0 });
    });
  });
});
