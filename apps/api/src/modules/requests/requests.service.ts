import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConcernsService } from '../concerns/concerns.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { ResolveRequestDto } from './dto/resolve-request.dto';
import { RequestType, RequestStatus, ConcernStatus } from '@prisma/client';

// Combined item interface for merged requests/concerns list
export interface CombinedRequestItem {
  id: string;
  category: 'REQUEST' | 'CONCERN';
  type: string;
  description: string;
  photoPath?: string;
  status: string;
  severity?: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  notes?: string;
  reportedRoom?: string;
  tenant?: {
    id: string;
    email: string;
    phone?: string;
    room?: {
      id: string;
      roomNumber: string;
    };
  };
  reporterRoom?: string;
  unitId?: string;
}

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private concernsService: ConcernsService,
  ) {}

  async create(tenantId: string, dto: CreateRequestDto) {
    // Verify tenant exists and get unit info
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        room: {
          include: {
            unit: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.room) {
      throw new BadRequestException('Tenant has no assigned room');
    }

    // Create request
    const request = await this.prisma.request.create({
      data: {
        tenantId,
        unitId: tenant.room.unitId,
        type: dto.type,
        description: dto.description,
        photoPath: dto.photoPath,
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

    // Create notification for tenant
    await this.notificationsService.createRequestReceivedNotification(
      tenantId,
      dto.type,
      request.id,
    );

    // Send email to all relevant admins (super admins, unit managers, legacy adminEmail)
    await this.notificationsService.sendRequestEmailToUnitAdmins(
      tenant.room.unitId,
      tenant,
      request,
    );

    return request;
  }

  async findAll(filters?: {
    tenantId?: string;
    unitId?: string;
    status?: RequestStatus;
    type?: RequestType;
  }) {
    const where: any = {};

    if (filters?.tenantId) {
      where.tenantId = filters.tenantId;
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

    return this.prisma.request.findMany({
      where,
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
  }

  async findOne(id: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        tenant: {
          include: {
            room: true,
          },
        },
        unit: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return request;
  }

  async resolve(id: string, resolvedBy: string, dto: ResolveRequestDto) {
    const request = await this.findOne(id);

    if (request.status === 'RESOLVED') {
      throw new BadRequestException('Request is already resolved');
    }

    // Update request status
    const updatedRequest = await this.prisma.request.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy,
        notes: dto.notes,
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

    // Notify tenant
    await this.notificationsService.createRequestResolvedNotification(
      request.tenantId,
      request.type,
      dto.notes,
    );

    return updatedRequest;
  }

  async getStatsByUnit(unitId: string) {
    const [pending, resolved] = await Promise.all([
      this.prisma.request.count({
        where: {
          unitId,
          status: 'PENDING',
        },
      }),
      this.prisma.request.count({
        where: {
          unitId,
          status: 'RESOLVED',
        },
      }),
    ]);

    return { pending, resolved };
  }

  /**
   * Get combined list of requests and concerns for a tenant
   * For tenants: shows their requests + concerns they reported
   */
  async findCombined(tenantId: string): Promise<CombinedRequestItem[]> {
    // Fetch requests for this tenant
    const requests = await this.prisma.request.findMany({
      where: { tenantId },
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

    // Fetch concerns reported BY this tenant (not about them)
    const concerns = await this.prisma.concern.findMany({
      where: { reporterId: tenantId },
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

    // Transform requests to combined format
    const requestItems: CombinedRequestItem[] = requests.map((r) => ({
      id: r.id,
      category: 'REQUEST' as const,
      type: r.type,
      description: r.description,
      photoPath: r.photoPath || undefined,
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt || undefined,
      resolvedBy: r.resolvedBy || undefined,
      notes: r.notes || undefined,
      tenant: r.tenant
        ? {
            id: r.tenant.id,
            email: r.tenant.email,
            phone: r.tenant.phone || undefined,
            room: r.tenant.room
              ? {
                  id: r.tenant.room.id,
                  roomNumber: r.tenant.room.roomNumber,
                }
              : undefined,
          }
        : undefined,
      unitId: r.unitId,
    }));

    // Transform concerns to combined format
    const concernItems: CombinedRequestItem[] = concerns.map((c) => ({
      id: c.id,
      category: 'CONCERN' as const,
      type: c.type,
      description: c.description,
      photoPath: c.photoPath || undefined,
      status: c.status,
      severity: c.severity,
      createdAt: c.createdAt,
      resolvedAt: c.resolvedAt || undefined,
      resolvedBy: c.resolvedBy || undefined,
      notes: c.notes || undefined,
      reportedRoom: c.reported?.room?.roomNumber,
      reporterRoom: c.reporter?.room?.roomNumber,
      tenant: c.reporter
        ? {
            id: c.reporter.id,
            email: c.reporter.email,
            phone: c.reporter.phone || undefined,
            room: c.reporter.room
              ? {
                  id: c.reporter.room.id,
                  roomNumber: c.reporter.room.roomNumber,
                }
              : undefined,
          }
        : undefined,
      unitId: c.unitId,
    }));

    // Merge and sort by createdAt desc
    const combined = [...requestItems, ...concernItems].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    return combined;
  }

  /**
   * Get combined list of requests and concerns for admin view
   * Supports filtering by unitId, status, category
   */
  async findCombinedAdmin(filters?: {
    unitId?: string;
    status?: string;
    category?: 'REQUEST' | 'CONCERN';
  }): Promise<CombinedRequestItem[]> {
    const results: CombinedRequestItem[] = [];

    // Fetch requests if not filtering to concerns only
    if (!filters?.category || filters.category === 'REQUEST') {
      const requestWhere: any = {};
      if (filters?.unitId) requestWhere.unitId = filters.unitId;
      if (filters?.status) {
        // Map common statuses to request statuses
        if (filters.status === 'PENDING' || filters.status === 'RESOLVED') {
          requestWhere.status = filters.status;
        }
      }

      const requests = await this.prisma.request.findMany({
        where: requestWhere,
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

      const requestItems: CombinedRequestItem[] = requests.map((r) => ({
        id: r.id,
        category: 'REQUEST' as const,
        type: r.type,
        description: r.description,
        photoPath: r.photoPath || undefined,
        status: r.status,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt || undefined,
        resolvedBy: r.resolvedBy || undefined,
        notes: r.notes || undefined,
        tenant: r.tenant
          ? {
              id: r.tenant.id,
              email: r.tenant.email,
              phone: r.tenant.phone || undefined,
              room: r.tenant.room
                ? {
                    id: r.tenant.room.id,
                    roomNumber: r.tenant.room.roomNumber,
                  }
                : undefined,
            }
          : undefined,
        unitId: r.unitId,
      }));

      results.push(...requestItems);
    }

    // Fetch concerns if not filtering to requests only
    if (!filters?.category || filters.category === 'CONCERN') {
      const concernWhere: any = {};
      if (filters?.unitId) concernWhere.unitId = filters.unitId;
      if (filters?.status) {
        // Concern has more statuses
        if (['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'].includes(filters.status)) {
          concernWhere.status = filters.status as ConcernStatus;
        }
      }

      const concerns = await this.prisma.concern.findMany({
        where: concernWhere,
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

      const concernItems: CombinedRequestItem[] = concerns.map((c) => ({
        id: c.id,
        category: 'CONCERN' as const,
        type: c.type,
        description: c.description,
        photoPath: c.photoPath || undefined,
        status: c.status,
        severity: c.severity,
        createdAt: c.createdAt,
        resolvedAt: c.resolvedAt || undefined,
        resolvedBy: c.resolvedBy || undefined,
        notes: c.notes || undefined,
        reportedRoom: c.reported?.room?.roomNumber,
        reporterRoom: c.reporter?.room?.roomNumber,
        tenant: c.reporter
          ? {
              id: c.reporter.id,
              email: c.reporter.email,
              phone: c.reporter.phone || undefined,
              room: c.reporter.room
                ? {
                    id: c.reporter.room.id,
                    roomNumber: c.reporter.room.roomNumber,
                  }
                : undefined,
            }
          : undefined,
        unitId: c.unitId,
      }));

      results.push(...concernItems);
    }

    // Sort combined results by createdAt desc
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return results;
  }

  /**
   * Get combined stats for requests and concerns
   */
  async getCombinedStats(unitId: string) {
    const [requestStats, concernStats] = await Promise.all([
      this.getStatsByUnit(unitId),
      this.concernsService.getStatsByUnit(unitId),
    ]);

    return {
      requests: requestStats,
      concerns: concernStats,
      totalActive: requestStats.pending + concernStats.active,
    };
  }

  /**
   * Get reportable tenants (delegates to concerns service)
   */
  async getReportableTenants(tenantId: string) {
    return this.concernsService.getReportableTenants(tenantId);
  }
}
