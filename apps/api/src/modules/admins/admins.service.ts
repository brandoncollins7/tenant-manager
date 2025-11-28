import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminRole } from '../../common/constants/admin-roles';

@Injectable()
export class AdminsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAdminDto) {
    return this.prisma.admin.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        name: dto.name,
        role: dto.role,
        unitAssignments: dto.unitIds?.length
          ? { create: dto.unitIds.map((unitId) => ({ unitId })) }
          : undefined,
      },
      include: {
        unitAssignments: { include: { unit: true } },
      },
    });
  }

  async findAll(currentAdminRole: string) {
    if (currentAdminRole !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin access required');
    }

    return this.prisma.admin.findMany({
      include: {
        unitAssignments: { include: { unit: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateAdminDto, currentAdminRole: string) {
    if (currentAdminRole !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin access required');
    }

    const { unitIds, ...updateData } = dto;

    return this.prisma.$transaction(async (tx) => {
      // Update admin basic fields
      await tx.admin.update({
        where: { id },
        data: {
          ...updateData,
          email: updateData.email?.toLowerCase().trim(),
        },
      });

      // Update unit assignments if provided
      if (unitIds !== undefined) {
        // Delete existing assignments
        await tx.adminUnitAssignment.deleteMany({ where: { adminId: id } });

        // Create new assignments
        if (unitIds.length > 0) {
          await tx.adminUnitAssignment.createMany({
            data: unitIds.map((unitId) => ({ adminId: id, unitId })),
          });
        }
      }

      // Return updated admin with assignments
      return tx.admin.findUnique({
        where: { id },
        include: { unitAssignments: { include: { unit: true } } },
      });
    });
  }

  async remove(id: string, currentAdminRole: string, currentAdminId: string) {
    if (currentAdminRole !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin access required');
    }

    if (id === currentAdminId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    return this.prisma.admin.delete({ where: { id } });
  }
}
