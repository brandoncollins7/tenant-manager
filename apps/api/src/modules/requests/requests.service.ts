import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { ResolveRequestDto } from './dto/resolve-request.dto';
import { RequestType, RequestStatus } from '@prisma/client';

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
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

    // Send email to admin if adminEmail is configured
    if (tenant.room.unit.adminEmail) {
      await this.notificationsService.sendRequestEmailToAdmin(
        tenant.room.unit.adminEmail,
        tenant,
        request,
      );
    }

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
}
