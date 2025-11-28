import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScheduleService } from './schedule.service';
import { CompleteChoreDto } from './dto/complete-chore.dto';

@Injectable()
export class ChoresService {
  constructor(
    private prisma: PrismaService,
    private scheduleService: ScheduleService,
  ) {}

  async getChoreDefinitions(unitId: string) {
    return this.prisma.choreDefinition.findMany({
      where: { unitId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createChoreDefinition(data: {
    name: string;
    description?: string;
    unitId: string;
    sortOrder?: number;
  }) {
    const maxSortOrder = await this.prisma.choreDefinition.findFirst({
      where: { unitId: data.unitId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return this.prisma.choreDefinition.create({
      data: {
        name: data.name,
        description: data.description,
        unitId: data.unitId,
        sortOrder: data.sortOrder ?? (maxSortOrder?.sortOrder ?? 0) + 1,
        isActive: true,
      },
    });
  }

  async updateChoreDefinition(
    id: string,
    data: {
      name?: string;
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.choreDefinition.update({
      where: { id },
      data,
    });
  }

  async deleteChoreDefinition(id: string) {
    // Soft delete by setting isActive to false
    return this.prisma.choreDefinition.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getCurrentSchedule(unitId: string) {
    const schedule = await this.scheduleService.getOrCreateCurrentSchedule(unitId);
    if (!schedule) {
      return { weekId: null, completions: [] };
    }
    return this.scheduleService.getScheduleForWeek(schedule.weekId);
  }

  async getScheduleByWeek(weekId: string, unitId?: string) {
    let schedule = await this.scheduleService.getScheduleForWeek(weekId);

    // If schedule doesn't exist and unitId is provided, try to create it
    if (!schedule && unitId) {
      schedule = await this.scheduleService.getOrCreateScheduleForWeek(weekId, unitId);
    }

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }
    return schedule;
  }

  async getWeeklyScheduleView(unitId: string) {
    // Get all active occupants in the unit
    const occupants = await this.prisma.occupant.findMany({
      where: {
        isActive: true,
        tenant: {
          isActive: true,
          room: {
            unitId,
          },
        },
      },
      include: {
        tenant: {
          include: {
            room: true,
          },
        },
      },
      orderBy: {
        choreDay: 'asc',
      },
    });

    // Get all active chores for the unit
    const chores = await this.prisma.choreDefinition.findMany({
      where: {
        unitId,
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    // Group occupants by day
    const scheduleByDay = Array.from({ length: 7 }, (_, day) => {
      const dayOccupants = occupants.filter(occ => occ.choreDay === day);
      return {
        day,
        occupants: dayOccupants.map(occ => ({
          id: occ.id,
          name: occ.name,
          roomNumber: occ.tenant.room?.roomNumber || 'N/A',
          chores: chores.map(chore => ({
            id: chore.id,
            name: chore.name,
            description: chore.description,
          })),
        })),
      };
    });

    return scheduleByDay;
  }

  async markComplete(completionId: string, dto: CompleteChoreDto) {
    const completion = await this.prisma.choreCompletion.findUnique({
      where: { id: completionId },
    });

    if (!completion) {
      throw new NotFoundException('Chore completion record not found');
    }

    return this.prisma.choreCompletion.update({
      where: { id: completionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        ...(dto.photoPath && {
          photoPath: dto.photoPath,
          photoUploadedAt: new Date(),
        }),
        ...(dto.notes && { notes: dto.notes }),
      },
      include: {
        occupant: true,
        chore: true,
      },
    });
  }

  async getCompletionHistory(occupantId: string, limit = 20) {
    return this.prisma.choreCompletion.findMany({
      where: { occupantId },
      include: {
        chore: true,
        schedule: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getCompletionStats(occupantId: string) {
    const completions = await this.prisma.choreCompletion.findMany({
      where: { occupantId },
    });

    const total = completions.length;
    const completed = completions.filter((c: any) => c.status === 'COMPLETED').length;
    const missed = completions.filter((c: any) => c.status === 'MISSED').length;
    const pending = completions.filter((c: any) => c.status === 'PENDING').length;

    return {
      total,
      completed,
      missed,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  async getTodaysChores(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        occupants: { where: { isActive: true } },
        room: { include: { unit: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const today = new Date().getDay();
    const occupantsWithChoreToday = tenant.occupants.filter(
      (o: any) => o.choreDay === today,
    );

    if (occupantsWithChoreToday.length === 0) {
      return { isChoreDay: false, occupants: [], chores: [] };
    }

    if (!tenant.room) {
      return { isChoreDay: true, occupants: occupantsWithChoreToday, chores: [] };
    }

    const schedule = await this.scheduleService.getOrCreateCurrentSchedule(
      tenant.room.unitId,
    );

    if (!schedule) {
      return { isChoreDay: true, occupants: occupantsWithChoreToday, chores: [] };
    }

    const chores = await this.prisma.choreCompletion.findMany({
      where: {
        scheduleId: schedule.id,
        occupantId: {
          in: occupantsWithChoreToday.map((o: any) => o.id),
        },
      },
      include: {
        chore: true,
        occupant: true,
      },
      orderBy: [
        { occupant: { name: 'asc' } },
        { chore: { sortOrder: 'asc' } },
      ],
    });

    return {
      isChoreDay: true,
      occupants: occupantsWithChoreToday,
      chores,
    };
  }
}
