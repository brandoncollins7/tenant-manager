import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminRole } from '../../common/constants/admin-roles';

@Injectable()
export class AdminsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async create(dto: CreateAdminDto) {
    const email = dto.email.toLowerCase().trim();

    // Create the admin
    const admin = await this.prisma.admin.create({
      data: {
        email,
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

    // Generate magic link for onboarding
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for onboarding

    await this.prisma.adminMagicLink.create({
      data: {
        token,
        expiresAt,
        adminId: admin.id,
      },
    });

    // Send onboarding email with admin details
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verifyUrl = `${frontendUrl}/verify?token=${token}`;
    const unitNames = admin.unitAssignments?.map((a) => a.unit.name) || [];

    await this.emailService.sendAdminOnboarding(
      email,
      admin.name,
      admin.role,
      verifyUrl,
      unitNames.length > 0 ? unitNames : undefined,
    );

    return admin;
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

  async findByUnit(unitId: string, currentAdminRole: string) {
    if (currentAdminRole !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin access required');
    }

    return this.prisma.admin.findMany({
      where: {
        unitAssignments: {
          some: { unitId },
        },
      },
      include: {
        unitAssignments: { include: { unit: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAvailableForUnit(unitId: string, currentAdminRole: string) {
    if (currentAdminRole !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin access required');
    }

    // Return property managers not already assigned to this unit
    return this.prisma.admin.findMany({
      where: {
        role: AdminRole.PROPERTY_MANAGER,
        unitAssignments: {
          none: { unitId },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async assignToUnit(adminId: string, unitId: string, currentAdminRole: string) {
    if (currentAdminRole !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin access required');
    }

    // Check if already assigned
    const existing = await this.prisma.adminUnitAssignment.findFirst({
      where: { adminId, unitId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.adminUnitAssignment.create({
      data: { adminId, unitId },
      include: {
        admin: true,
        unit: true,
      },
    });
  }

  async removeFromUnit(adminId: string, unitId: string, currentAdminRole: string) {
    if (currentAdminRole !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin access required');
    }

    return this.prisma.adminUnitAssignment.deleteMany({
      where: { adminId, unitId },
    });
  }
}
