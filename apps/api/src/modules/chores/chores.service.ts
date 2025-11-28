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
