import { PrismaService } from '../../src/prisma/prisma.service';
import { UnitFactory } from './unit.factory';
import { RoomFactory } from './room.factory';
import { TenantFactory } from './tenant.factory';
import { OccupantFactory } from './occupant.factory';
import { AdminFactory } from './admin.factory';
import { ChoreDefinitionFactory, ChoreScheduleFactory } from './chore.factory';

export class TestFactories {
  readonly unit: UnitFactory;
  readonly room: RoomFactory;
  readonly tenant: TenantFactory;
  readonly occupant: OccupantFactory;
  readonly admin: AdminFactory;
  readonly choreDefinition: ChoreDefinitionFactory;
  readonly choreSchedule: ChoreScheduleFactory;

  constructor(prisma: PrismaService) {
    this.unit = new UnitFactory(prisma);
    this.room = new RoomFactory(prisma);
    this.tenant = new TenantFactory(prisma);
    this.occupant = new OccupantFactory(prisma);
    this.admin = new AdminFactory(prisma);
    this.choreDefinition = new ChoreDefinitionFactory(prisma);
    this.choreSchedule = new ChoreScheduleFactory(prisma);
  }
}

export function createFactories(prisma: PrismaService): TestFactories {
  return new TestFactories(prisma);
}

// Re-export individual factories
export { UnitFactory } from './unit.factory';
export { RoomFactory } from './room.factory';
export { TenantFactory } from './tenant.factory';
export { OccupantFactory } from './occupant.factory';
export { AdminFactory } from './admin.factory';
export { ChoreDefinitionFactory, ChoreScheduleFactory } from './chore.factory';
export { uniqueId, uniqueEmail } from './base.factory';
