import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  @Cron('0 9 * * *') // Every day at 9 AM
  async sendDailyReminders() {
    this.logger.log('Sending daily chore reminders...');

    const today = new Date();
    const dayOfWeek = today.getDay();

    // Find all occupants whose chore day is today
    const occupants = await this.prisma.occupant.findMany({
      where: {
        choreDay: dayOfWeek,
        isActive: true,
        tenant: { isActive: true },
      },
      include: {
        tenant: true,
      },
    });

    const dateStr = today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    for (const occupant of occupants) {
      await this.notificationsService.createChoreReminderNotification(
        occupant.tenant.id,
        occupant.name,
        dateStr,
      );
    }

    this.logger.log(`Sent ${occupants.length} chore reminders`);
  }

  @Cron('0 0 * * 0') // Every Sunday at midnight
  async expireOldSwapRequests() {
    this.logger.log('Expiring old swap requests...');

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const result = await this.prisma.swapRequest.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: oneWeekAgo },
      },
      data: { status: 'EXPIRED' },
    });

    this.logger.log(`Expired ${result.count} swap requests`);
  }

  @Cron('0 23 * * *') // Every day at 11 PM
  async markMissedChores() {
    this.logger.log('Marking missed chores...');

    const today = new Date();
    const dayOfWeek = today.getDay();

    // Find all incomplete chores for today's occupants
    const result = await this.prisma.choreCompletion.updateMany({
      where: {
        status: 'PENDING',
        occupant: {
          choreDay: dayOfWeek,
          isActive: true,
        },
        schedule: {
          weekStart: { lte: today },
        },
      },
      data: { status: 'MISSED' },
    });

    this.logger.log(`Marked ${result.count} chores as missed`);
  }

  @Cron('30 23 * * *') // Every day at 11:30 PM (after missed chores are marked)
  async sendDailyAdminReports() {
    this.logger.log('Sending daily admin reports...');

    const today = new Date();
    const dayOfWeek = today.getDay();

    // Get all units with their admin assignments
    const units = await this.prisma.unit.findMany({
      include: {
        adminAssignments: { include: { admin: true } },
      },
    });

    let reportsSent = 0;

    for (const unit of units) {
      // Skip units with no admins
      if (!unit.adminAssignments.length) continue;

      // Get today's completions for this unit
      const completions = await this.prisma.choreCompletion.findMany({
        where: {
          chore: { unitId: unit.id },
          occupant: { choreDay: dayOfWeek, isActive: true },
          schedule: { weekStart: { lte: today } },
        },
        include: {
          occupant: true,
          chore: true,
        },
      });

      // Skip if no chores were due today
      if (!completions.length) continue;

      // Format date
      const dateStr = today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      // Send to each admin
      for (const assignment of unit.adminAssignments) {
        await this.emailService.sendDailyChoreReport(
          assignment.admin.email,
          assignment.admin.name,
          unit.name,
          dateStr,
          completions.map((c) => ({
            occupantName: c.occupant.name,
            choreName: c.chore.name,
            status: c.status,
            completedAt: c.completedAt,
          })),
        );
        reportsSent++;
      }
    }

    this.logger.log(`Sent ${reportsSent} daily admin reports`);
  }
}
