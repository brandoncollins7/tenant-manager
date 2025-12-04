import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRoomDto) {
    // Check if unit exists
    const unit = await this.prisma.unit.findUnique({
      where: { id: dto.unitId },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    // Check for duplicate room number in same unit
    const existing = await this.prisma.room.findUnique({
      where: {
        unitId_roomNumber: {
          unitId: dto.unitId,
          roomNumber: dto.roomNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Room number already exists in this unit');
    }

    return this.prisma.room.create({
      data: dto,
      include: {
        unit: true,
        tenant: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
      },
    });
  }

  async findAll(unitId?: string) {
    return this.prisma.room.findMany({
      where: unitId ? { unitId } : undefined,
      include: {
        unit: true,
        tenant: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ unit: { name: 'asc' } }, { roomNumber: 'asc' }],
    });
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        unit: true,
        tenant: {
          include: {
            occupants: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Filter out inactive tenants (soft-deleted)
    if (room.tenant && !room.tenant.isActive) {
      return { ...room, tenant: null };
    }

    return room;
  }

  async update(id: string, dto: UpdateRoomDto) {
    await this.findOne(id);

    return this.prisma.room.update({
      where: { id },
      data: dto,
      include: {
        unit: true,
        tenant: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const room = await this.findOne(id);

    if (room.tenant) {
      throw new ConflictException('Cannot delete room with active tenant');
    }

    return this.prisma.room.delete({
      where: { id },
    });
  }
}
