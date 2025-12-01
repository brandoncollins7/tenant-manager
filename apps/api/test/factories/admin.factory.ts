import { Admin, AdminRole } from '@prisma/client';
import { BaseFactory, uniqueEmail, uniqueId } from './base.factory';

interface AdminFactoryInput {
  email?: string;
  name?: string;
  role?: AdminRole;
  unitIds?: string[];
}

export class AdminFactory extends BaseFactory<AdminFactoryInput, Admin> {
  build(overrides: AdminFactoryInput = {}): AdminFactoryInput {
    return {
      email: uniqueEmail('admin'),
      name: `Admin ${uniqueId()}`,
      role: 'PROPERTY_MANAGER',
      ...overrides,
    };
  }

  async create(overrides: AdminFactoryInput = {}): Promise<Admin> {
    const data = this.build(overrides);
    const admin = await this.prisma.admin.create({
      data: {
        email: data.email!,
        name: data.name!,
        role: data.role!,
      },
    });

    // Create unit assignments if unitIds provided
    if (data.unitIds?.length) {
      await this.prisma.adminUnitAssignment.createMany({
        data: data.unitIds.map((unitId) => ({
          adminId: admin.id,
          unitId,
        })),
      });
    }

    return admin;
  }

  async createSuperAdmin(
    overrides: Omit<AdminFactoryInput, 'role'> = {},
  ): Promise<Admin> {
    return this.create({ ...overrides, role: 'SUPER_ADMIN' });
  }

  async createPropertyManager(
    unitIds: string[],
    overrides: Omit<AdminFactoryInput, 'role' | 'unitIds'> = {},
  ): Promise<Admin> {
    return this.create({ ...overrides, role: 'PROPERTY_MANAGER', unitIds });
  }
}
