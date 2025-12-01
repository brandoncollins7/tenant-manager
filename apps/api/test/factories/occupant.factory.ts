import { Occupant } from '@prisma/client';
import { BaseFactory, uniqueId } from './base.factory';

interface OccupantFactoryInput {
  tenantId: string;
  name?: string;
  choreDay?: number;
  isActive?: boolean;
}

export class OccupantFactory extends BaseFactory<OccupantFactoryInput, Occupant> {
  build(overrides: OccupantFactoryInput): OccupantFactoryInput {
    return {
      name: `Occupant ${uniqueId()}`,
      choreDay: 1, // Monday by default
      isActive: true,
      ...overrides,
    };
  }

  async create(overrides: OccupantFactoryInput): Promise<Occupant> {
    const data = this.build(overrides);
    return this.prisma.occupant.create({
      data: {
        name: data.name!,
        choreDay: data.choreDay!,
        isActive: data.isActive,
        tenant: { connect: { id: data.tenantId } },
      },
    });
  }
}
