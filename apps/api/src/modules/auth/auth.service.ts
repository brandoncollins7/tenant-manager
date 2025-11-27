import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';

export interface JwtPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
  tenantId?: string;
  adminId?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async requestMagicLink(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { email: normalizedEmail },
    });

    // Check if admin exists
    const admin = await this.prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });

    if (!tenant && !admin) {
      // For security, don't reveal if email exists
      return { message: 'If this email is registered, a login link has been sent.' };
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store magic link
    if (tenant) {
      await this.prisma.magicLink.create({
        data: {
          token,
          expiresAt,
          tenantId: tenant.id,
        },
      });
    } else if (admin) {
      await this.prisma.adminMagicLink.create({
        data: {
          token,
          expiresAt,
          adminId: admin.id,
        },
      });
    }

    // Send email
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verifyUrl = `${frontendUrl}/verify?token=${token}`;

    await this.emailService.sendMagicLink(normalizedEmail, verifyUrl);

    return { message: 'If this email is registered, a login link has been sent.' };
  }

  async verifyMagicLink(token: string): Promise<{ accessToken: string; user: unknown }> {
    // Try tenant magic link first
    const tenantMagicLink = await this.prisma.magicLink.findUnique({
      where: { token },
      include: {
        tenant: {
          include: {
            occupants: true,
            room: {
              include: {
                unit: true,
              },
            },
          },
        },
      },
    });

    if (tenantMagicLink) {
      return this.verifyTenantMagicLink(tenantMagicLink);
    }

    // Try admin magic link
    const adminMagicLink = await this.prisma.adminMagicLink.findUnique({
      where: { token },
      include: { admin: true },
    });

    if (adminMagicLink) {
      return this.verifyAdminMagicLink(adminMagicLink);
    }

    throw new UnauthorizedException('Invalid or expired link');
  }

  private async verifyTenantMagicLink(magicLink: {
    id: string;
    token: string;
    expiresAt: Date;
    isUsed: boolean;
    tenant: {
      id: string;
      email: string;
      occupants: { id: string; name: string; choreDay: number; isActive: boolean }[];
      room: { id: string; roomNumber: string; unit: { id: string; name: string } };
    };
  }) {
    if (magicLink.isUsed) {
      throw new UnauthorizedException('This link has already been used');
    }

    if (magicLink.expiresAt < new Date()) {
      throw new UnauthorizedException('This link has expired');
    }

    // Mark as used
    await this.prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { isUsed: true, usedAt: new Date() },
    });

    // Generate JWT
    const payload: JwtPayload = {
      sub: magicLink.tenant.id,
      email: magicLink.tenant.email,
      isAdmin: false,
      tenantId: magicLink.tenant.id,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: magicLink.tenant.id,
        email: magicLink.tenant.email,
        isAdmin: false,
        occupants: magicLink.tenant.occupants.filter((o) => o.isActive),
        room: magicLink.tenant.room,
      },
    };
  }

  private async verifyAdminMagicLink(magicLink: {
    id: string;
    token: string;
    expiresAt: Date;
    isUsed: boolean;
    admin: { id: string; email: string; name: string };
  }) {
    if (magicLink.isUsed) {
      throw new UnauthorizedException('This link has already been used');
    }

    if (magicLink.expiresAt < new Date()) {
      throw new UnauthorizedException('This link has expired');
    }

    // Mark as used
    await this.prisma.adminMagicLink.update({
      where: { id: magicLink.id },
      data: { isUsed: true, usedAt: new Date() },
    });

    // Generate JWT
    const payload: JwtPayload = {
      sub: magicLink.admin.id,
      email: magicLink.admin.email,
      isAdmin: true,
      adminId: magicLink.admin.id,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: magicLink.admin.id,
        email: magicLink.admin.email,
        name: magicLink.admin.name,
        isAdmin: true,
      },
    };
  }

  async getMe(userId: string, isAdmin: boolean) {
    if (isAdmin) {
      const admin = await this.prisma.admin.findUnique({
        where: { id: userId },
      });

      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        isAdmin: true,
      };
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: userId },
      include: {
        occupants: {
          where: { isActive: true },
        },
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

    return {
      id: tenant.id,
      email: tenant.email,
      isAdmin: false,
      occupants: tenant.occupants,
      room: tenant.room,
    };
  }
}
