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
        startDate: dto.startDate,
        endDate: dto.endDate,
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

  async findAll(unitId?: string) {
    return this.prisma.tenant.findMany({
      where: unitId
        ? {
            room: { unitId },
            isActive: true,
          }
        : { isActive: true },
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

    return this.prisma.tenant.update({
      where: { id },
      data: {
        email: dto.email?.toLowerCase().trim(),
        phone: dto.phone,
        endDate: dto.endDate,
      },
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

  async getAvailableRooms() {
    return this.prisma.room.findMany({
      where: {
        tenant: null,
      },
      include: {
        unit: true,
      },
      orderBy: [{ unit: { name: 'asc' } }, { roomNumber: 'asc' }],
    });
  }

  async updateLeaseDocument(id: string, leaseDocument: string) {
    await this.findOne(id);

    return this.prisma.tenant.update({
      where: { id },
      data: { leaseDocument },
    });
  }
}
