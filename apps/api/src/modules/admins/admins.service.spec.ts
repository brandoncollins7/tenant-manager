import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminsService } from './admins.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { AdminRole } from '../../common/constants/admin-roles';

describe('AdminsService', () => {
  let service: AdminsService;
  let prisma: DeepMockProxy<PrismaClient>;
  let emailService: jest.Mocked<EmailService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminsService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        {
          provide: EmailService,
          useValue: {
            sendAdminOnboarding: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:5173'),
          },
        },
      ],
    }).compile();

    service = module.get<AdminsService>(AdminsService);
    prisma = module.get(PrismaService);
    emailService = module.get(EmailService);
    configService = module.get(ConfigService);
  });

  describe('create', () => {
    it('should create super admin successfully', async () => {
      const dto = {
        email: 'SUPER@EXAMPLE.COM',
        name: 'Super Admin',
        role: AdminRole.SUPER_ADMIN,
      };

      const expected = {
        id: 'uuid',
        email: 'super@example.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        createdAt: new Date(),
        unitAssignments: [],
      };

      prisma.admin.create.mockResolvedValue(expected as any);
      prisma.adminMagicLink.create.mockResolvedValue({} as any);

      const result = await service.create(dto);

      expect(result).toEqual(expected);
      expect(prisma.admin.create).toHaveBeenCalledWith({
        data: {
          email: 'super@example.com',
          name: 'Super Admin',
          role: 'SUPER_ADMIN',
          unitAssignments: undefined,
        },
        include: {
          unitAssignments: { include: { unit: true } },
        },
      });
      expect(prisma.adminMagicLink.create).toHaveBeenCalled();
      expect(emailService.sendAdminOnboarding).toHaveBeenCalledWith(
        'super@example.com',
        'Super Admin',
        'SUPER_ADMIN',
        expect.stringContaining('http://localhost:5173/verify?token='),
        undefined,
      );
    });

    it('should create property manager with unit assignments', async () => {
      const dto = {
        email: 'manager@example.com',
        name: 'Property Manager',
        role: AdminRole.PROPERTY_MANAGER,
        unitIds: ['unit-1', 'unit-2'],
      };

      const expected = {
        id: 'uuid',
        email: 'manager@example.com',
        name: 'Property Manager',
        role: 'PROPERTY_MANAGER',
        createdAt: new Date(),
        unitAssignments: [
          { id: 'assignment-1', unitId: 'unit-1', unit: { id: 'unit-1', name: 'Unit 1' } },
          { id: 'assignment-2', unitId: 'unit-2', unit: { id: 'unit-2', name: 'Unit 2' } },
        ],
      };

      prisma.admin.create.mockResolvedValue(expected as any);
      prisma.adminMagicLink.create.mockResolvedValue({} as any);

      const result = await service.create(dto);

      expect(result).toEqual(expected);
      expect(prisma.admin.create).toHaveBeenCalledWith({
        data: {
          email: 'manager@example.com',
          name: 'Property Manager',
          role: 'PROPERTY_MANAGER',
          unitAssignments: {
            create: [{ unitId: 'unit-1' }, { unitId: 'unit-2' }],
          },
        },
        include: {
          unitAssignments: { include: { unit: true } },
        },
      });
      expect(emailService.sendAdminOnboarding).toHaveBeenCalledWith(
        'manager@example.com',
        'Property Manager',
        'PROPERTY_MANAGER',
        expect.stringContaining('http://localhost:5173/verify?token='),
        ['Unit 1', 'Unit 2'],
      );
    });

    it('should normalize email (lowercase, trim)', async () => {
      const dto = {
        email: '  ADMIN@EXAMPLE.COM  ',
        name: 'Admin',
        role: AdminRole.SUPER_ADMIN,
      };

      prisma.admin.create.mockResolvedValue({ id: 'uuid' } as any);
      prisma.adminMagicLink.create.mockResolvedValue({} as any);

      await service.create(dto);

      expect(prisma.admin.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'admin@example.com',
          }),
        }),
      );
    });

    it('should create admin without unit assignments when unitIds is empty', async () => {
      const dto = {
        email: 'admin@example.com',
        name: 'Admin',
        role: AdminRole.SUPER_ADMIN,
        unitIds: [],
      };

      prisma.admin.create.mockResolvedValue({ id: 'uuid' } as any);
      prisma.adminMagicLink.create.mockResolvedValue({} as any);

      await service.create(dto);

      expect(prisma.admin.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unitAssignments: undefined,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all admins for super admin', async () => {
      const expected = [
        {
          id: 'admin-1',
          email: 'admin1@example.com',
          name: 'Admin 1',
          role: 'SUPER_ADMIN',
          unitAssignments: [],
        },
        {
          id: 'admin-2',
          email: 'admin2@example.com',
          name: 'Admin 2',
          role: 'PROPERTY_MANAGER',
          unitAssignments: [{ unitId: 'unit-1', unit: { id: 'unit-1', name: 'Unit 1' } }],
        },
      ];

      prisma.admin.findMany.mockResolvedValue(expected as any);

      const result = await service.findAll(AdminRole.SUPER_ADMIN);

      expect(result).toEqual(expected);
      expect(prisma.admin.findMany).toHaveBeenCalledWith({
        include: {
          unitAssignments: { include: { unit: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw ForbiddenException for property manager', async () => {
      await expect(service.findAll(AdminRole.PROPERTY_MANAGER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should include unit assignments in response', async () => {
      const expected = [
        {
          id: 'admin-1',
          unitAssignments: [
            { id: 'a1', unitId: 'u1', unit: { id: 'u1', name: 'Unit 1' } },
          ],
        },
      ];

      prisma.admin.findMany.mockResolvedValue(expected as any);

      const result = await service.findAll(AdminRole.SUPER_ADMIN);

      expect(result[0].unitAssignments).toBeDefined();
      expect(result[0].unitAssignments.length).toBe(1);
    });
  });

  describe('update', () => {
    it('should update admin details for super admin', async () => {
      const dto = {
        name: 'Updated Name',
        role: AdminRole.PROPERTY_MANAGER,
      };

      const expected = {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Updated Name',
        role: 'PROPERTY_MANAGER',
        unitAssignments: [],
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          admin: {
            update: jest.fn().mockResolvedValue(expected),
            findUnique: jest.fn().mockResolvedValue(expected),
          },
          adminUnitAssignment: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
        } as any);
      });

      const result = await service.update('admin-1', dto, AdminRole.SUPER_ADMIN);

      expect(result).toEqual(expected);
    });

    it('should update unit assignments (adds and removes)', async () => {
      const dto = {
        unitIds: ['unit-2', 'unit-3'],
      };

      const mockTx = {
        admin: {
          update: jest.fn().mockResolvedValue({}),
          findUnique: jest.fn().mockResolvedValue({ id: 'admin-1', unitAssignments: [] }),
        },
        adminUnitAssignment: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
      };

      prisma.$transaction.mockImplementation(async (callback) => callback(mockTx as any));

      await service.update('admin-1', dto, AdminRole.SUPER_ADMIN);

      expect(mockTx.adminUnitAssignment.deleteMany).toHaveBeenCalledWith({
        where: { adminId: 'admin-1' },
      });
      expect(mockTx.adminUnitAssignment.createMany).toHaveBeenCalledWith({
        data: [{ adminId: 'admin-1', unitId: 'unit-2' }, { adminId: 'admin-1', unitId: 'unit-3' }],
      });
    });

    it('should throw ForbiddenException for property manager', async () => {
      await expect(
        service.update('admin-1', { name: 'New Name' }, AdminRole.PROPERTY_MANAGER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should normalize email when updating', async () => {
      const dto = {
        email: '  NEW@EXAMPLE.COM  ',
      };

      const mockTx = {
        admin: {
          update: jest.fn().mockResolvedValue({}),
          findUnique: jest.fn().mockResolvedValue({}),
        },
        adminUnitAssignment: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
      };

      prisma.$transaction.mockImplementation(async (callback) => callback(mockTx as any));

      await service.update('admin-1', dto, AdminRole.SUPER_ADMIN);

      expect(mockTx.admin.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete admin for super admin', async () => {
      const expected = { id: 'admin-1', email: 'admin@example.com' };

      prisma.admin.delete.mockResolvedValue(expected as any);

      const result = await service.remove('admin-1', AdminRole.SUPER_ADMIN, 'admin-2');

      expect(result).toEqual(expected);
      expect(prisma.admin.delete).toHaveBeenCalledWith({ where: { id: 'admin-1' } });
    });

    it('should throw ForbiddenException for property manager', async () => {
      await expect(
        service.remove('admin-1', AdminRole.PROPERTY_MANAGER, 'admin-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent self-deletion', async () => {
      await expect(
        service.remove('admin-1', AdminRole.SUPER_ADMIN, 'admin-1'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.remove('admin-1', AdminRole.SUPER_ADMIN, 'admin-1'),
      ).rejects.toThrow('Cannot delete your own account');
    });
  });
});
