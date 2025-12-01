import { ChoreDefinition, ChoreSchedule, ChoreCompletion } from '@prisma/client';
import { BaseFactory, uniqueId } from './base.factory';

interface ChoreDefinitionInput {
  unitId: string;
  name?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export class ChoreDefinitionFactory extends BaseFactory<
  ChoreDefinitionInput,
  ChoreDefinition
> {
  build(overrides: ChoreDefinitionInput): ChoreDefinitionInput {
    return {
      name: `Chore ${uniqueId()}`,
      description: 'Test chore description',
      icon: '🧹',
      isActive: true,
      sortOrder: 0,
      ...overrides,
    };
  }

  async create(overrides: ChoreDefinitionInput): Promise<ChoreDefinition> {
    const data = this.build(overrides);
    return this.prisma.choreDefinition.create({
      data: {
        name: data.name!,
        description: data.description,
        icon: data.icon,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        unit: { connect: { id: data.unitId } },
      },
    });
  }
}

interface ChoreScheduleInput {
  weekId?: string;
  weekStart?: Date;
}

export class ChoreScheduleFactory extends BaseFactory<
  ChoreScheduleInput,
  ChoreSchedule
> {
  build(overrides: ChoreScheduleInput = {}): ChoreScheduleInput {
    // Get Monday of current week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    // Format as ISO week (YYYY-Www)
    const year = monday.getFullYear();
    const weekNum = Math.ceil(
      ((monday.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7,
    );
    const weekId = `${year}-W${weekNum.toString().padStart(2, '0')}`;

    return {
      weekId,
      weekStart: monday,
      ...overrides,
    };
  }

  async create(overrides: ChoreScheduleInput = {}): Promise<ChoreSchedule> {
    const data = this.build(overrides);
    return this.prisma.choreSchedule.create({
      data: {
        weekId: data.weekId!,
        weekStart: data.weekStart!,
      },
    });
  }

  async createWithCompletions(
    schedule: ChoreSchedule,
    completions: Array<{ occupantId: string; choreId: string }>,
  ): Promise<ChoreCompletion[]> {
    return Promise.all(
      completions.map((c) =>
        this.prisma.choreCompletion.create({
          data: {
            schedule: { connect: { id: schedule.id } },
            occupant: { connect: { id: c.occupantId } },
            chore: { connect: { id: c.choreId } },
            status: 'PENDING',
          },
        }),
      ),
    );
  }
}
