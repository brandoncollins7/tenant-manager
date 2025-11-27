import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(private prisma: PrismaService) {}

  getWeekId(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // Get to Monday
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);

    // Get week number
    const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
    const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

    return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  }

  getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d;
  }

  @Cron(CronExpression.EVERY_WEEK) // Runs Sunday at midnight
  async generateWeeklySchedules() {
    this.logger.log('Generating weekly schedules...');

    const units = await this.prisma.unit.findMany({
      include: {
        chores: { where: { isActive: true } },
        rooms: {
          include: {
            tenant: {
              where: { isActive: true },
              include: {
                occupants: { where: { isActive: true } },
              },
            },
          },
        },
      },
    });

    const nextWeekStart = new Date();
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const weekId = this.getWeekId(nextWeekStart);
    const weekStart = this.getWeekStart(nextWeekStart);

    for (const unit of units) {
      await this.generateScheduleForUnit(unit, weekId, weekStart);
    }

    this.logger.log('Weekly schedules generated');
  }

  async generateScheduleForUnit(
    unit: {
      id: string;
      chores: { id: string }[];
      rooms: { tenant: { occupants: { id: string }[] } | null }[];
    },
    weekId: string,
    weekStart: Date,
  ) {
    // Check if schedule already exists
    const existing = await this.prisma.choreSchedule.findUnique({
      where: { weekId },
    });

    if (existing) {
      this.logger.log(`Schedule for ${weekId} already exists`);
      return existing;
    }

    // Create schedule
    const schedule = await this.prisma.choreSchedule.create({
      data: {
        weekId,
        weekStart,
      },
    });

    // Get all active occupants in this unit
    const occupants = unit.rooms.flatMap(
      (room) => room.tenant?.occupants || [],
    );

    // Create completion records for each occupant × chore
    const completionData = occupants.flatMap((occupant) =>
      unit.chores.map((chore) => ({
        scheduleId: schedule.id,
        occupantId: occupant.id,
        choreId: chore.id,
      })),
    );

    if (completionData.length > 0) {
      await this.prisma.choreCompletion.createMany({
        data: completionData,
      });
    }

    return schedule;
  }

  async getOrCreateCurrentSchedule(unitId: string) {
    const weekId = this.getWeekId(new Date());
    const weekStart = this.getWeekStart(new Date());

    let schedule = await this.prisma.choreSchedule.findUnique({
      where: { weekId },
    });

    if (!schedule) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: unitId },
        include: {
          chores: { where: { isActive: true } },
          rooms: {
            include: {
              tenant: {
                where: { isActive: true },
                include: {
                  occupants: { where: { isActive: true } },
                },
              },
            },
          },
        },
      });

      if (unit) {
        schedule = await this.generateScheduleForUnit(unit, weekId, weekStart);
      }
    }

    return schedule;
  }

  async getScheduleForWeek(weekId: string) {
    return this.prisma.choreSchedule.findUnique({
      where: { weekId },
      include: {
        completions: {
          include: {
            occupant: {
              include: {
                tenant: {
                  include: { room: true },
                },
              },
            },
            chore: true,
          },
          orderBy: [{ occupant: { choreDay: 'asc' } }, { chore: { sortOrder: 'asc' } }],
        },
      },
    });
  }

  async redistributeChores(unitId: string, removedOccupantDay: number) {
    // When an occupant leaves, temporarily assign their day to others
    const currentWeekId = this.getWeekId(new Date());

    const activeOccupants = await this.prisma.occupant.findMany({
      where: {
        isActive: true,
        tenant: {
          room: { unitId },
          isActive: true,
        },
      },
      orderBy: { choreDay: 'asc' },
    });

    if (activeOccupants.length === 0) return;

    // Round-robin assignment of the removed day
    const assignee = activeOccupants[0];

    await this.prisma.tempAssignment.create({
      data: {
        occupantId: assignee.id,
        originalDay: removedOccupantDay,
        weekId: currentWeekId,
        reason: 'Covering for departed tenant',
      },
    });
  }
}
