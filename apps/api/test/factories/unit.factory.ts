import { Unit, Prisma } from '@prisma/client';
import { BaseFactory, uniqueId } from './base.factory';

type UnitCreateInput = Prisma.UnitCreateInput;

export class UnitFactory extends BaseFactory<Partial<UnitCreateInput>, Unit> {
  build(overrides: Partial<UnitCreateInput> = {}): UnitCreateInput {
    return {
      name: `Test Unit ${uniqueId()}`,
      timezone: 'America/Toronto',
      ...overrides,
    };
  }

  async create(overrides: Partial<UnitCreateInput> = {}): Promise<Unit> {
    return this.prisma.unit.create({
      data: this.build(overrides),
    });
  }
}
