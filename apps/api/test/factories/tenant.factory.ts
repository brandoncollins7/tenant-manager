import { Tenant } from '@prisma/client';
import { BaseFactory, uniqueEmail } from './base.factory';

interface TenantFactoryInput {
  email?: string;
  phone?: string | null;
  startDate?: Date;
  endDate?: Date | null;
  isActive?: boolean;
  roomId?: string | null;
}

export class TenantFactory extends BaseFactory<TenantFactoryInput, Tenant> {
  build(overrides: TenantFactoryInput = {}): TenantFactoryInput {
    return {
      email: uniqueEmail('tenant'),
      phone: null,
      startDate: new Date(),
      endDate: null,
      isActive: true,
      ...overrides,
    };
  }

  async create(overrides: TenantFactoryInput = {}): Promise<Tenant> {
    const data = this.build(overrides);
    return this.prisma.tenant.create({
      data: {
        email: data.email!,
        phone: data.phone,
        startDate: data.startDate!,
        endDate: data.endDate,
        isActive: data.isActive,
        room: data.roomId ? { connect: { id: data.roomId } } : undefined,
      },
    });
  }

  async createWithRoom(
    roomId: string,
    overrides: Omit<TenantFactoryInput, 'roomId'> = {},
  ): Promise<Tenant> {
    return this.create({ ...overrides, roomId });
  }
}
