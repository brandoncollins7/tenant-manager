import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateConcernDto } from './dto/create-concern.dto';
import { UpdateConcernDto } from './dto/update-concern.dto';
import { ConcernType, ConcernStatus } from '@prisma/client';

@Injectable()
export class ConcernsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(reporterId: string, dto: CreateConcernDto) {
    // Verify reporter tenant exists and get unit info
    const reporter = await this.prisma.tenant.findUnique({
      where: { id: reporterId },
      include: {
        room: {
          include: {
            unit: true,
          },
        },
      },
    });

    if (!reporter) {
      throw new NotFoundException('Reporter tenant not found');
    }

    if (!reporter.room) {
      throw new BadRequestException('Reporter has no assigned room');
    }

    // Verify reported tenant exists
    const reported = await this.prisma.tenant.findUnique({
      where: { id: dto.reportedId },
      include: {
        room: {
          include: {
            unit: true,
          },
        },
      },
    });

    if (!reported) {
      throw new NotFoundException('Reported tenant not found');
    }

    if (!reported.room) {
      throw new BadRequestException('Reported tenant has no assigned room');
    }

    // Verify both tenants are in the same unit
    if (reporter.room.unitId !== reported.room.unitId) {
      throw new BadRequestException(
        'Can only raise concerns about tenants in the same unit',
      );
    }

    // Cannot report yourself
    if (reporterId === dto.reportedId) {
      throw new BadRequestException('Cannot raise a concern about yourself');
    }

    // Create the concern
    const concern = await this.prisma.concern.create({
      data: {
        reporterId,
        reportedId: dto.reportedId,
        unitId: reporter.room.unitId,
        type: dto.type,
        severity: dto.severity,
        description: dto.description,
        photoPath: dto.photoPath,
      },
      include: {
        reporter: {
          include: {
            room: true,
          },
        },
        reported: {
          include: {
            room: true,
          },
        },
        unit: true,
      },
    });

    // Send email notification to unit admins (NOT to reported tenant)
    await this.notificationsService.sendConcernEmailToUnitAdmins(
      reporter.room.unitId,
      reporter,
      reported,
      concern,
    );

    return concern;
  }

  async findAll(filters?: {
    reporterId?: string;
    reportedId?: string;
    unitId?: string;
    status?: ConcernStatus;
    type?: ConcernType;
  }) {
    const where: any = {};

    if (filters?.reporterId) {
      where.reporterId = filters.reporterId;
    }

    if (filters?.reportedId) {
      where.reportedId = filters.reportedId;
    }

    if (filters?.unitId) {
      where.unitId = filters.unitId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    return this.prisma.concern.findMany({
      where,
      include: {
        reporter: {
          include: {
            room: true,
          },
        },
        reported: {
          include: {
            room: true,
          },
        },
        unit: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const concern = await this.prisma.concern.findUnique({
      where: { id },
      include: {
        reporter: {
          include: {
            room: true,
          },
        },
        reported: {
          include: {
            room: true,
          },
        },
        unit: true,
      },
    });

    if (!concern) {
      throw new NotFoundException('Concern not found');
    }

    return concern;
  }

  async update(id: string, resolvedBy: string, dto: UpdateConcernDto) {
    const concern = await this.findOne(id);

    const isResolving =
      dto.status === 'RESOLVED' || dto.status === 'DISMISSED';
    const alreadyResolved =
      concern.status === 'RESOLVED' || concern.status === 'DISMISSED';

    if (isResolving && alreadyResolved) {
      throw new BadRequestException('Concern is already resolved or dismissed');
    }

    // Update concern
    const updatedConcern = await this.prisma.concern.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        ...(isResolving && {
          resolvedAt: new Date(),
          resolvedBy,
        }),
      },
      include: {
        reporter: {
          include: {
            room: true,
          },
        },
        reported: {
          include: {
            room: true,
          },
        },
        unit: true,
      },
    });

    // Note: We intentionally do NOT notify the reported tenant
    // This is a private report to management only

    return updatedConcern;
  }

  async getStatsByUnit(unitId: string) {
    const [pending, underReview, resolved, dismissed] = await Promise.all([
      this.prisma.concern.count({
        where: { unitId, status: 'PENDING' },
      }),
      this.prisma.concern.count({
        where: { unitId, status: 'UNDER_REVIEW' },
      }),
      this.prisma.concern.count({
        where: { unitId, status: 'RESOLVED' },
      }),
      this.prisma.concern.count({
        where: { unitId, status: 'DISMISSED' },
      }),
    ]);

    return {
      pending,
      underReview,
      resolved,
      dismissed,
      active: pending + underReview,
    };
  }

  async getReportableTenants(tenantId: string) {
    // Get the current tenant's unit
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        room: true,
      },
    });

    if (!tenant || !tenant.room) {
      throw new NotFoundException('Tenant not found or has no assigned room');
    }

    // Get other tenants in the same unit (excluding the reporter)
    const otherTenants = await this.prisma.tenant.findMany({
      where: {
        id: { not: tenantId },
        isActive: true,
        room: {
          unitId: tenant.room.unitId,
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

    // Return minimal info (just id and room number for privacy)
    return otherTenants.map((t) => ({
      id: t.id,
      roomNumber: t.room?.roomNumber || 'Unknown',
    }));
  }
}
