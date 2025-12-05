import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConcernsService } from './concerns.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import {
  PrismaClient,
  ConcernType,
  ConcernSeverity,
  ConcernStatus,
} from '@prisma/client';

describe('ConcernsService', () => {
  let service: ConcernsService;
  let prisma: DeepMockProxy<PrismaClient>;
  let notificationsService: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConcernsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        {
          provide: NotificationsService,
          useValue: {
            sendConcernEmailToUnitAdmins: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConcernsService>(ConcernsService);
    prisma = module.get(PrismaService);
    notificationsService = module.get(NotificationsService);
  });

  describe('create', () => {
    const mockReporter = {
      id: 'reporter-1',
      email: 'reporter@example.com',
      room: {
        id: 'room-1',
        roomNumber: '101',
        unitId: 'unit-1',
        unit: {
          id: 'unit-1',
          name: 'Test Unit',
        },
      },
    };

    const mockReported = {
      id: 'reported-1',
      email: 'reported@example.com',
      room: {
        id: 'room-2',
        roomNumber: '102',
        unitId: 'unit-1',
        unit: {
          id: 'unit-1',
          name: 'Test Unit',
        },
      },
    };

    it('should create a concern and send email to admins', async () => {
      const mockConcern = {
        id: 'concern-1',
        reporterId: 'reporter-1',
        reportedId: 'reported-1',
        unitId: 'unit-1',
        type: ConcernType.NOISE,
        severity: ConcernSeverity.MEDIUM,
        description: 'Too loud at night',
        status: ConcernStatus.PENDING,
        reporter: mockReporter,
        reported: mockReported,
        unit: mockReporter.room.unit,
      };

      prisma.tenant.findUnique
        .mockResolvedValueOnce(mockReporter as any)
        .mockResolvedValueOnce(mockReported as any);
      prisma.concern.create.mockResolvedValue(mockConcern as any);

      const result = await service.create('reporter-1', {
        reportedId: 'reported-1',
        type: ConcernType.NOISE,
        description: 'Too loud at night',
      });

      expect(result).toEqual(mockConcern);
      expect(prisma.concern.create).toHaveBeenCalledWith({
        data: {
          reporterId: 'reporter-1',
          reportedId: 'reported-1',
          unitId: 'unit-1',
          type: ConcernType.NOISE,
          severity: undefined,
          description: 'Too loud at night',
          photoPath: undefined,
        },
        include: expect.any(Object),
      });
      expect(notificationsService.sendConcernEmailToUnitAdmins).toHaveBeenCalledWith(
        'unit-1',
        mockReporter,
        mockReported,
        mockConcern,
      );
    });

    it('should create a concern with severity and photo', async () => {
      const mockConcern = {
        id: 'concern-1',
        reporterId: 'reporter-1',
        reportedId: 'reported-1',
        unitId: 'unit-1',
        type: ConcernType.PROPERTY_DAMAGE,
        severity: ConcernSeverity.HIGH,
        description: 'Damaged the door',
        photoPath: 'photos/damage.jpg',
        status: ConcernStatus.PENDING,
      };

      prisma.tenant.findUnique
        .mockResolvedValueOnce(mockReporter as any)
        .mockResolvedValueOnce(mockReported as any);
      prisma.concern.create.mockResolvedValue(mockConcern as any);

      const result = await service.create('reporter-1', {
        reportedId: 'reported-1',
        type: ConcernType.PROPERTY_DAMAGE,
        severity: ConcernSeverity.HIGH,
        description: 'Damaged the door',
        photoPath: 'photos/damage.jpg',
      });

      expect(result.severity).toBe(ConcernSeverity.HIGH);
      expect(result.photoPath).toBe('photos/damage.jpg');
    });

    it('should throw NotFoundException when reporter not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.create('invalid-reporter', {
          reportedId: 'reported-1',
          type: ConcernType.NOISE,
          description: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.concern.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when reporter has no room', async () => {
      const mockTenantNoRoom = { id: 'reporter-1', room: null };

      prisma.tenant.findUnique.mockResolvedValue(mockTenantNoRoom as any);

      await expect(
        service.create('reporter-1', {
          reportedId: 'reported-1',
          type: ConcernType.NOISE,
          description: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.concern.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when reported tenant not found', async () => {
      prisma.tenant.findUnique
        .mockResolvedValueOnce(mockReporter as any)
        .mockResolvedValueOnce(null);

      await expect(
        service.create('reporter-1', {
          reportedId: 'invalid-reported',
          type: ConcernType.NOISE,
          description: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.concern.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when tenants are in different units', async () => {
      const mockReportedDifferentUnit = {
        ...mockReported,
        room: {
          ...mockReported.room,
          unitId: 'unit-2', // Different unit
        },
      };

      prisma.tenant.findUnique
        .mockResolvedValueOnce(mockReporter as any)
        .mockResolvedValueOnce(mockReportedDifferentUnit as any);

      await expect(
        service.create('reporter-1', {
          reportedId: 'reported-1',
          type: ConcernType.NOISE,
          description: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.concern.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when reporting self', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockReporter as any);

      await expect(
        service.create('reporter-1', {
          reportedId: 'reporter-1', // Same as reporter
          type: ConcernType.NOISE,
          description: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.concern.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all concerns when no filters provided', async () => {
      const mockConcerns = [
        {
          id: 'concern-1',
          type: ConcernType.NOISE,
          status: ConcernStatus.PENDING,
        },
        {
          id: 'concern-2',
          type: ConcernType.CLEANLINESS,
          status: ConcernStatus.RESOLVED,
        },
      ];

      prisma.concern.findMany.mockResolvedValue(mockConcerns as any);

      const result = await service.findAll();

      expect(result).toEqual(mockConcerns);
      expect(prisma.concern.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by reporterId', async () => {
      prisma.concern.findMany.mockResolvedValue([]);

      await service.findAll({ reporterId: 'reporter-1' });

      expect(prisma.concern.findMany).toHaveBeenCalledWith({
        where: { reporterId: 'reporter-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      prisma.concern.findMany.mockResolvedValue([]);

      await service.findAll({ status: ConcernStatus.PENDING });

      expect(prisma.concern.findMany).toHaveBeenCalledWith({
        where: { status: ConcernStatus.PENDING },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by unitId and type', async () => {
      prisma.concern.findMany.mockResolvedValue([]);

      await service.findAll({
        unitId: 'unit-1',
        type: ConcernType.HARASSMENT,
      });

      expect(prisma.concern.findMany).toHaveBeenCalledWith({
        where: {
          unitId: 'unit-1',
          type: ConcernType.HARASSMENT,
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a concern by id', async () => {
      const mockConcern = {
        id: 'concern-1',
        type: ConcernType.NOISE,
        description: 'Too loud',
      };

      prisma.concern.findUnique.mockResolvedValue(mockConcern as any);

      const result = await service.findOne('concern-1');

      expect(result).toEqual(mockConcern);
      expect(prisma.concern.findUnique).toHaveBeenCalledWith({
        where: { id: 'concern-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when concern does not exist', async () => {
      prisma.concern.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update status and set resolvedAt when resolved', async () => {
      const mockConcern = {
        id: 'concern-1',
        status: ConcernStatus.PENDING,
      };
      const mockUpdatedConcern = {
        ...mockConcern,
        status: ConcernStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedBy: 'admin@example.com',
        notes: 'Issue addressed',
      };

      prisma.concern.findUnique.mockResolvedValue(mockConcern as any);
      prisma.concern.update.mockResolvedValue(mockUpdatedConcern as any);

      const result = await service.update('concern-1', 'admin@example.com', {
        status: ConcernStatus.RESOLVED,
        notes: 'Issue addressed',
      });

      expect(result.status).toBe(ConcernStatus.RESOLVED);
      expect(prisma.concern.update).toHaveBeenCalledWith({
        where: { id: 'concern-1' },
        data: {
          status: ConcernStatus.RESOLVED,
          notes: 'Issue addressed',
          resolvedAt: expect.any(Date),
          resolvedBy: 'admin@example.com',
        },
        include: expect.any(Object),
      });
    });

    it('should update status to UNDER_REVIEW without setting resolvedAt', async () => {
      const mockConcern = {
        id: 'concern-1',
        status: ConcernStatus.PENDING,
      };
      const mockUpdatedConcern = {
        ...mockConcern,
        status: ConcernStatus.UNDER_REVIEW,
      };

      prisma.concern.findUnique.mockResolvedValue(mockConcern as any);
      prisma.concern.update.mockResolvedValue(mockUpdatedConcern as any);

      await service.update('concern-1', 'admin@example.com', {
        status: ConcernStatus.UNDER_REVIEW,
      });

      expect(prisma.concern.update).toHaveBeenCalledWith({
        where: { id: 'concern-1' },
        data: {
          status: ConcernStatus.UNDER_REVIEW,
          notes: undefined,
        },
        include: expect.any(Object),
      });
    });

    it('should update notes only', async () => {
      const mockConcern = {
        id: 'concern-1',
        status: ConcernStatus.UNDER_REVIEW,
      };

      prisma.concern.findUnique.mockResolvedValue(mockConcern as any);
      prisma.concern.update.mockResolvedValue(mockConcern as any);

      await service.update('concern-1', 'admin@example.com', {
        notes: 'Still investigating',
      });

      expect(prisma.concern.update).toHaveBeenCalledWith({
        where: { id: 'concern-1' },
        data: {
          status: undefined,
          notes: 'Still investigating',
        },
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException when already resolved', async () => {
      const mockConcern = {
        id: 'concern-1',
        status: ConcernStatus.RESOLVED,
      };

      prisma.concern.findUnique.mockResolvedValue(mockConcern as any);

      await expect(
        service.update('concern-1', 'admin@example.com', {
          status: ConcernStatus.RESOLVED,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.concern.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when already dismissed', async () => {
      const mockConcern = {
        id: 'concern-1',
        status: ConcernStatus.DISMISSED,
      };

      prisma.concern.findUnique.mockResolvedValue(mockConcern as any);

      await expect(
        service.update('concern-1', 'admin@example.com', {
          status: ConcernStatus.RESOLVED,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.concern.update).not.toHaveBeenCalled();
    });
  });

  describe('getStatsByUnit', () => {
    it('should return correct counts for each status', async () => {
      prisma.concern.count
        .mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(2) // under_review
        .mockResolvedValueOnce(10) // resolved
        .mockResolvedValueOnce(1); // dismissed

      const result = await service.getStatsByUnit('unit-1');

      expect(result).toEqual({
        pending: 3,
        underReview: 2,
        resolved: 10,
        dismissed: 1,
        active: 5, // pending + underReview
      });
      expect(prisma.concern.count).toHaveBeenCalledTimes(4);
    });

    it('should return zero counts when no concerns exist', async () => {
      prisma.concern.count.mockResolvedValue(0);

      const result = await service.getStatsByUnit('unit-1');

      expect(result).toEqual({
        pending: 0,
        underReview: 0,
        resolved: 0,
        dismissed: 0,
        active: 0,
      });
    });
  });

  describe('getReportableTenants', () => {
    it('should return other tenants in the same unit', async () => {
      const mockTenant = {
        id: 'tenant-1',
        room: {
          unitId: 'unit-1',
        },
      };
      const mockOtherTenants = [
        { id: 'tenant-2', room: { roomNumber: '102' } },
        { id: 'tenant-3', room: { roomNumber: '103' } },
      ];

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);
      prisma.tenant.findMany.mockResolvedValue(mockOtherTenants as any);

      const result = await service.getReportableTenants('tenant-1');

      expect(result).toEqual([
        { id: 'tenant-2', roomNumber: '102' },
        { id: 'tenant-3', roomNumber: '103' },
      ]);
      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        where: {
          id: { not: 'tenant-1' },
          isActive: true,
          room: {
            unitId: 'unit-1',
          },
        },
        include: {
          room: true,
        },
        orderBy: {
          room: {
            roomNumber: 'asc',
          },
        },
      });
    });

    it('should throw NotFoundException when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getReportableTenants('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when tenant has no room', async () => {
      const mockTenantNoRoom = { id: 'tenant-1', room: null };

      prisma.tenant.findUnique.mockResolvedValue(mockTenantNoRoom as any);

      await expect(service.getReportableTenants('tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
