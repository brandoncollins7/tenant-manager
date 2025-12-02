import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { AdminRole } from '../../common/constants/admin-roles';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: DeepMockProxy<PrismaClient>;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                FRONTEND_URL: 'http://localhost:5173',
                JWT_SECRET: 'test-secret',
              };
              return config[key];
            }),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendMagicLink: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
    emailService = module.get(EmailService);
  });

  describe('requestMagicLink', () => {
    it('should create magic link and send email for existing tenant', async () => {
      const mockTenant = {
        id: 'tenant-1',
        email: 'test@example.com',
        roomId: 'room-1',
        phone: null,
        startDate: new Date(),
        endDate: null,
        isActive: true,
        leaseDocument: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.admin.findUnique.mockResolvedValue(null);
      prisma.magicLink.create.mockResolvedValue({
        id: 'link-1',
        token: 'test-token',
        tenantId: 'tenant-1',
        expiresAt: new Date(),
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      });

      const result = await service.requestMagicLink('test@example.com');

      expect(result.message).toContain('If this email is registered');
      expect(prisma.magicLink.create).toHaveBeenCalled();
      expect(emailService.sendMagicLink).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('http://localhost:5173/verify?token='),
      );
    });

    it('should not reveal if email does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.admin.findUnique.mockResolvedValue(null);

      const result = await service.requestMagicLink('unknown@example.com');

      expect(result.message).toContain('If this email is registered');
      expect(prisma.magicLink.create).not.toHaveBeenCalled();
      expect(emailService.sendMagicLink).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.admin.findUnique.mockResolvedValue(null);

      await service.requestMagicLink('TEST@EXAMPLE.COM');

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should create magic link and send email for existing admin', async () => {
      const mockAdmin = {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: AdminRole.SUPER_ADMIN,
        createdAt: new Date(),
      };

      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.admin.findUnique.mockResolvedValue(mockAdmin as any);
      prisma.adminMagicLink.create.mockResolvedValue({
        id: 'admin-link-1',
        token: 'admin-token',
        adminId: 'admin-1',
        expiresAt: new Date(),
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      });

      const result = await service.requestMagicLink('admin@example.com');

      expect(result.message).toContain('If this email is registered');
      expect(prisma.adminMagicLink.create).toHaveBeenCalled();
      expect(emailService.sendMagicLink).toHaveBeenCalledWith(
        'admin@example.com',
        expect.stringContaining('http://localhost:5173/verify?token='),
      );
    });
  });

  describe('verifyMagicLink', () => {
    it('should return JWT for valid tenant token', async () => {
      const mockMagicLink = {
        id: 'link-1',
        token: 'valid-token',
        isUsed: false,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
        tenantId: 'tenant-1',
        usedAt: null,
        createdAt: new Date(),
        tenant: {
          id: 'tenant-1',
          email: 'test@example.com',
          roomId: 'room-1',
          phone: null,
          startDate: new Date(),
          endDate: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          occupants: [
            { id: 'occ-1', name: 'John', choreDay: 1, isActive: true },
          ],
          room: {
            id: 'room-1',
            roomNumber: 'Room 1',
            unitId: 'unit-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            unit: { id: 'unit-1', name: 'Test Unit', timezone: 'America/Toronto', createdAt: new Date(), updatedAt: new Date() },
          },
        },
      };

      prisma.magicLink.findUnique.mockResolvedValue(mockMagicLink);
      prisma.adminMagicLink.findUnique.mockResolvedValue(null);
      prisma.magicLink.update.mockResolvedValue({
        ...mockMagicLink,
        isUsed: true,
        usedAt: new Date(),
      });

      const result = await service.verifyMagicLink('valid-token');

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user).toHaveProperty('id', 'tenant-1');
      expect(result.user).toHaveProperty('email', 'test@example.com');
      expect(result.user).toHaveProperty('isAdmin', false);
      expect(prisma.magicLink.update).toHaveBeenCalledWith({
        where: { id: 'link-1' },
        data: { isUsed: true, usedAt: expect.any(Date) },
      });
    });

    it('should reject expired token', async () => {
      const mockMagicLink = {
        id: 'link-1',
        token: 'expired-token',
        isUsed: false,
        expiresAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
        tenantId: 'tenant-1',
        usedAt: null,
        createdAt: new Date(),
        tenant: {
          id: 'tenant-1',
          email: 'test@example.com',
          roomId: 'room-1',
          phone: null,
          startDate: new Date(),
          endDate: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          occupants: [],
          room: {
            id: 'room-1',
            roomNumber: 'Room 1',
            unitId: 'unit-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            unit: { id: 'unit-1', name: 'Test Unit', timezone: 'America/Toronto', createdAt: new Date(), updatedAt: new Date() },
          },
        },
      };

      prisma.magicLink.findUnique.mockResolvedValue(mockMagicLink);

      await expect(service.verifyMagicLink('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyMagicLink('expired-token')).rejects.toThrow(
        'This link has expired',
      );
    });

    it('should reject already used token', async () => {
      const mockMagicLink = {
        id: 'link-1',
        token: 'used-token',
        isUsed: true,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        tenantId: 'tenant-1',
        usedAt: new Date(),
        createdAt: new Date(),
        tenant: {
          id: 'tenant-1',
          email: 'test@example.com',
          roomId: 'room-1',
          phone: null,
          startDate: new Date(),
          endDate: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          occupants: [],
          room: {
            id: 'room-1',
            roomNumber: 'Room 1',
            unitId: 'unit-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            unit: { id: 'unit-1', name: 'Test Unit', timezone: 'America/Toronto', createdAt: new Date(), updatedAt: new Date() },
          },
        },
      };

      prisma.magicLink.findUnique.mockResolvedValue(mockMagicLink);

      await expect(service.verifyMagicLink('used-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyMagicLink('used-token')).rejects.toThrow(
        'This link has already been used',
      );
    });

    it('should reject invalid token', async () => {
      prisma.magicLink.findUnique.mockResolvedValue(null);
      prisma.adminMagicLink.findUnique.mockResolvedValue(null);

      await expect(service.verifyMagicLink('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyMagicLink('invalid-token')).rejects.toThrow(
        'Invalid or expired link',
      );
    });

    it('should return JWT for valid admin token', async () => {
      const mockAdminMagicLink = {
        id: 'admin-link-1',
        token: 'admin-token',
        isUsed: false,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        adminId: 'admin-1',
        usedAt: null,
        createdAt: new Date(),
        admin: {
          id: 'admin-1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: AdminRole.SUPER_ADMIN,
          createdAt: new Date(),
          unitAssignments: [],
        },
      };

      prisma.magicLink.findUnique.mockResolvedValue(null);
      prisma.adminMagicLink.findUnique.mockResolvedValue(mockAdminMagicLink);
      prisma.adminMagicLink.update.mockResolvedValue({
        ...mockAdminMagicLink,
        isUsed: true,
        usedAt: new Date(),
      });

      const result = await service.verifyMagicLink('admin-token');

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user).toHaveProperty('id', 'admin-1');
      expect(result.user).toHaveProperty('isAdmin', true);
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          isAdmin: true,
          adminId: 'admin-1',
        }),
      );
    });

    it('should include unitIds in JWT for admin with unit assignments', async () => {
      const mockAdminMagicLink = {
        id: 'admin-link-1',
        token: 'admin-token',
        isUsed: false,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        adminId: 'admin-1',
        usedAt: null,
        createdAt: new Date(),
        admin: {
          id: 'admin-1',
          email: 'admin@example.com',
          name: 'Property Manager',
          role: AdminRole.PROPERTY_MANAGER,
          createdAt: new Date(),
          unitAssignments: [
            { unitId: 'unit-1' },
            { unitId: 'unit-2' },
          ],
        },
      };

      prisma.magicLink.findUnique.mockResolvedValue(null);
      prisma.adminMagicLink.findUnique.mockResolvedValue(mockAdminMagicLink);
      prisma.adminMagicLink.update.mockResolvedValue({
        ...mockAdminMagicLink,
        isUsed: true,
        usedAt: new Date(),
      });

      const result = await service.verifyMagicLink('admin-token');

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          isAdmin: true,
          adminId: 'admin-1',
          adminRole: AdminRole.PROPERTY_MANAGER,
          unitIds: ['unit-1', 'unit-2'],
        }),
      );
    });

    it('should reject expired admin token', async () => {
      const mockAdminMagicLink = {
        id: 'admin-link-1',
        token: 'expired-admin-token',
        isUsed: false,
        expiresAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
        adminId: 'admin-1',
        usedAt: null,
        createdAt: new Date(),
        admin: {
          id: 'admin-1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: AdminRole.SUPER_ADMIN,
          createdAt: new Date(),
          unitAssignments: [],
        },
      };

      prisma.magicLink.findUnique.mockResolvedValue(null);
      prisma.adminMagicLink.findUnique.mockResolvedValue(mockAdminMagicLink);

      await expect(service.verifyMagicLink('expired-admin-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyMagicLink('expired-admin-token')).rejects.toThrow(
        'This link has expired',
      );
    });

    it('should reject already used admin token', async () => {
      const mockAdminMagicLink = {
        id: 'admin-link-1',
        token: 'used-admin-token',
        isUsed: true,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        adminId: 'admin-1',
        usedAt: new Date(),
        createdAt: new Date(),
        admin: {
          id: 'admin-1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: AdminRole.SUPER_ADMIN,
          createdAt: new Date(),
          unitAssignments: [],
        },
      };

      prisma.magicLink.findUnique.mockResolvedValue(null);
      prisma.adminMagicLink.findUnique.mockResolvedValue(mockAdminMagicLink);

      await expect(service.verifyMagicLink('used-admin-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyMagicLink('used-admin-token')).rejects.toThrow(
        'This link has already been used',
      );
    });
  });

  describe('getMe', () => {
    it('should return admin user data', async () => {
      const mockAdmin = {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: AdminRole.SUPER_ADMIN,
        createdAt: new Date(),
        unitAssignments: [],
      };

      prisma.admin.findUnique.mockResolvedValue(mockAdmin as any);

      const result = await service.getMe('admin-1', true);

      expect(result).toEqual({
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin User',
        isAdmin: true,
        role: AdminRole.SUPER_ADMIN,
        unitAssignments: [],
      });
    });

    it('should throw NotFoundException for non-existent admin', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(service.getMe('invalid-admin', true)).rejects.toThrow(NotFoundException);
      await expect(service.getMe('invalid-admin', true)).rejects.toThrow('Admin not found');
    });

    it('should return tenant user data', async () => {
      const mockTenant = {
        id: 'tenant-1',
        email: 'tenant@example.com',
        occupants: [{ id: 'occ-1', name: 'John', choreDay: 1, isActive: true }],
        room: {
          id: 'room-1',
          roomNumber: '101',
          unit: { id: 'unit-1', name: 'Building A' },
        },
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);

      const result = await service.getMe('tenant-1', false);

      expect(result).toEqual({
        id: 'tenant-1',
        email: 'tenant@example.com',
        isAdmin: false,
        occupants: mockTenant.occupants,
        room: mockTenant.room,
      });
    });

    it('should throw NotFoundException for non-existent tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getMe('invalid-tenant', false)).rejects.toThrow(NotFoundException);
      await expect(service.getMe('invalid-tenant', false)).rejects.toThrow('Tenant not found');
    });
  });

  describe('getLatestMagicLink', () => {
    it('should return latest magic link for admin', async () => {
      const mockAdmin = {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: AdminRole.SUPER_ADMIN,
        createdAt: new Date(),
        unitAssignments: [],
      };
      const mockLink = {
        id: 'link-1',
        token: 'admin-token',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isUsed: false,
      };

      prisma.admin.findUnique.mockResolvedValue(mockAdmin);
      prisma.adminMagicLink.findFirst.mockResolvedValue(mockLink as any);

      const result = await service.getLatestMagicLink('admin@example.com');

      expect(result.email).toBe('admin@example.com');
      expect(result.url).toContain('admin-token');
      expect(result.isUsed).toBe(false);
    });

    it('should return latest magic link for tenant', async () => {
      const mockTenant = {
        id: 'tenant-1',
        email: 'tenant@example.com',
      };
      const mockLink = {
        id: 'link-1',
        token: 'tenant-token',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isUsed: false,
      };

      prisma.admin.findUnique.mockResolvedValue(null);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);
      prisma.magicLink.findFirst.mockResolvedValue(mockLink as any);

      const result = await service.getLatestMagicLink('tenant@example.com');

      expect(result.email).toBe('tenant@example.com');
      expect(result.url).toContain('tenant-token');
      expect(result.isUsed).toBe(false);
    });

    it('should return null url when no magic link exists for admin', async () => {
      const mockAdmin = {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: AdminRole.SUPER_ADMIN,
        createdAt: new Date(),
        unitAssignments: [],
      };

      prisma.admin.findUnique.mockResolvedValue(mockAdmin);
      prisma.adminMagicLink.findFirst.mockResolvedValue(null);

      const result = await service.getLatestMagicLink('admin@example.com');

      expect(result.email).toBe('admin@example.com');
      expect(result.url).toBeNull();
    });

    it('should return null url when no magic link exists for tenant', async () => {
      const mockTenant = {
        id: 'tenant-1',
        email: 'tenant@example.com',
      };

      prisma.admin.findUnique.mockResolvedValue(null);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);
      prisma.magicLink.findFirst.mockResolvedValue(null);

      const result = await service.getLatestMagicLink('tenant@example.com');

      expect(result.email).toBe('tenant@example.com');
      expect(result.url).toBeNull();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getLatestMagicLink('unknown@example.com')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getLatestMagicLink('unknown@example.com')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('createImpersonationLink', () => {
    it('should create impersonation link for existing tenant', async () => {
      const mockTenant = {
        id: 'tenant-1',
        email: 'tenant@example.com',
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant as any);
      prisma.magicLink.create.mockResolvedValue({
        id: 'link-1',
        token: 'impersonation-token',
        tenantId: 'tenant-1',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      });

      const result = await service.createImpersonationLink('tenant-1');

      expect(result.url).toContain('http://localhost:5173/verify?token=');
      expect(prisma.magicLink.create).toHaveBeenCalledWith({
        data: {
          token: expect.any(String),
          expiresAt: expect.any(Date),
          tenantId: 'tenant-1',
        },
      });
    });

    it('should throw NotFoundException for non-existent tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.createImpersonationLink('invalid-tenant')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createImpersonationLink('invalid-tenant')).rejects.toThrow(
        'Tenant not found',
      );
    });
  });
});
