import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    return this.prisma.tenant.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone,
        roomId: dto.roomId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        occupants: {
          create: {
            name: dto.primaryOccupantName,
            choreDay: dto.choreDay,
          },
        },
      },
      include: {
        occupants: true,
        room: {
          include: { unit: true },
        },
      },
    });
  }

  async findAll(unitId?: string, adminRole?: string, adminUnitIds?: string[]) {
    let where: any = { isActive: true };

    if (unitId) {
      where.room = { unitId };
    } else if (adminRole === 'PROPERTY_MANAGER' && adminUnitIds?.length) {
      where.room = { unitId: { in: adminUnitIds } };
    }

    return this.prisma.tenant.findMany({
      where,
      include: {
        occupants: {
          where: { isActive: true },
        },
        room: {
          include: { unit: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        occupants: {
          where: { isActive: true },
        },
        room: {
          include: { unit: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);

    // Build the data object
    const updateData: {
      email?: string;
      phone?: string;
      endDate?: Date | null;
      room?: { disconnect: true } | { connect: { id: string } };
    } = {};

    if (dto.email !== undefined) {
      updateData.email = dto.email.toLowerCase().trim();
    }

    if (dto.phone !== undefined) {
      updateData.phone = dto.phone;
    }

    if (dto.endDate !== undefined) {
      updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    // Handle room assignment/removal
    if (dto.roomId !== undefined) {
      if (dto.roomId === null) {
        // Disconnect from room
        updateData.room = { disconnect: true };
      } else {
        // Connect to a room
        updateData.room = { connect: { id: dto.roomId } };
      }
    }

    return this.prisma.tenant.update({
      where: { id },
      data: updateData,
      include: {
        occupants: {
          where: { isActive: true },
        },
        room: {
          include: { unit: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.tenant.update({
      where: { id },
      data: {
        isActive: false,
        endDate: new Date(),
      },
    });
  }

  async getAvailableRooms(unitId?: string) {
    return this.prisma.room.findMany({
      where: {
        tenant: null,
        ...(unitId && { unitId }),
      },
      include: {
        unit: true,
      },
      orderBy: [{ unit: { name: 'asc' } }, { roomNumber: 'asc' }],
    });
  }

  async getUnassignedTenants() {
    return this.prisma.tenant.findMany({
      where: {
        isActive: true,
        roomId: null,
      },
      include: {
        occupants: {
          where: { isActive: true },
        },
      },
      orderBy: { email: 'asc' },
    });
  }

  async updateLeaseDocument(id: string, leaseDocument: string) {
    await this.findOne(id);

    return this.prisma.tenant.update({
      where: { id },
      data: { leaseDocument },
    });
  }

  async uploadLeaseVersion(
    tenantId: string,
    filename: string,
    uploadedBy: string,
    notes?: string,
  ) {
    // Use transaction to ensure consistency
    return this.prisma.$transaction(async (tx) => {
      // Set all existing versions to isCurrent=false
      await tx.leaseDocument.updateMany({
        where: { tenantId, isCurrent: true },
        data: { isCurrent: false },
      });

      // Get next version number
      const lastVersion = await tx.leaseDocument.findFirst({
        where: { tenantId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const nextVersion = (lastVersion?.version || 0) + 1;

      // Create new version
      const leaseDoc = await tx.leaseDocument.create({
        data: {
          tenantId,
          version: nextVersion,
          filename,
          uploadedBy,
          notes,
          isCurrent: true,
        },
      });

      // Update tenant.leaseDocument for backward compatibility
      await tx.tenant.update({
        where: { id: tenantId },
        data: { leaseDocument: filename },
      });

      return leaseDoc;
    });
  }

  async getLeaseHistory(tenantId: string) {
    return this.prisma.leaseDocument.findMany({
      where: { tenantId },
      orderBy: { version: 'desc' },
    });
  }

  async getLeaseVersion(tenantId: string, version: number) {
    return this.prisma.leaseDocument.findUnique({
      where: {
        tenantId_version: { tenantId, version },
      },
    });
  }

  async getCurrentLease(tenantId: string) {
    return this.prisma.leaseDocument.findFirst({
      where: { tenantId, isCurrent: true },
    });
  }
}
