import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOccupantDto } from './dto/create-occupant.dto';
import { UpdateOccupantDto } from './dto/update-occupant.dto';

@Injectable()
export class OccupantsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateOccupantDto) {
    // Check if day is available in the unit
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { room: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.room) {
      throw new BadRequestException('Tenant must be assigned to a room before adding occupants');
    }

    const existingOccupant = await this.prisma.occupant.findFirst({
      where: {
        choreDay: dto.choreDay,
        isActive: true,
        tenant: {
          room: { unitId: tenant.room.unitId },
          isActive: true,
        },
      },
    });

    if (existingOccupant) {
      throw new BadRequestException('This chore day is already taken');
    }

    return this.prisma.occupant.create({
      data: {
        tenantId,
        name: dto.name,
        choreDay: dto.choreDay,
      },
    });
  }

  async findByTenant(tenantId: string) {
    return this.prisma.occupant.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { choreDay: 'asc' },
    });
  }

  async findOne(id: string) {
    const occupant = await this.prisma.occupant.findUnique({
      where: { id },
      include: {
        tenant: {
          include: {
            room: { include: { unit: true } },
          },
        },
      },
    });

    if (!occupant) {
      throw new NotFoundException('Occupant not found');
    }

    return occupant;
  }

  async update(id: string, dto: UpdateOccupantDto) {
    const occupant = await this.findOne(id);

    // If changing chore day, check availability
    if (dto.choreDay !== undefined && dto.choreDay !== occupant.choreDay) {
      if (!occupant.tenant.room) {
        throw new BadRequestException('Cannot change chore day for tenant not assigned to a room');
      }

      const existingOccupant = await this.prisma.occupant.findFirst({
        where: {
          choreDay: dto.choreDay,
          isActive: true,
          id: { not: id },
          tenant: {
            room: { unitId: occupant.tenant.room.unitId },
            isActive: true,
          },
        },
      });

      if (existingOccupant) {
        throw new BadRequestException('This chore day is already taken');
      }
    }

    return this.prisma.occupant.update({
      where: { id },
      data: {
        name: dto.name,
        choreDay: dto.choreDay,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.occupant.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getAvailableDays(unitId: string) {
    const takenDays = await this.prisma.occupant.findMany({
      where: {
        isActive: true,
        tenant: {
          room: { unitId },
          isActive: true,
        },
      },
      select: { choreDay: true },
    });

    const takenDaySet = new Set(takenDays.map((o) => o.choreDay));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return days.map((name, index) => ({
      day: index,
      name,
      available: !takenDaySet.has(index),
    }));
  }
}
