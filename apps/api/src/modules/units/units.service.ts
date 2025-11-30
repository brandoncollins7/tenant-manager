import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUnitDto) {
    return this.prisma.unit.create({
      data: {
        name: dto.name,
        timezone: dto.timezone || 'America/Toronto',
      },
      include: {
        rooms: true,
        chores: true,
      },
    });
  }

  async findAll(adminRole?: string, unitIds?: string[]) {
    const where =
      adminRole === 'PROPERTY_MANAGER' && unitIds?.length
        ? { id: { in: unitIds } }
        : {};

    return this.prisma.unit.findMany({
      where,
      include: {
        rooms: {
          include: {
            tenant: {
              select: {
                id: true,
                email: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            rooms: true,
            chores: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        rooms: {
          include: {
            tenant: {
              select: {
                id: true,
                email: true,
                isActive: true,
              },
            },
          },
        },
        chores: true,
      },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return unit;
  }

  async update(id: string, dto: UpdateUnitDto) {
    await this.findOne(id);

    return this.prisma.unit.update({
      where: { id },
      data: dto,
      include: {
        rooms: true,
        chores: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.unit.delete({
      where: { id },
    });
  }
}
