import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getOccupantStats(occupantId: string) {
    const completions = await this.prisma.choreCompletion.findMany({
      where: { occupantId },
    });

    const total = completions.length;
    const completed = completions.filter((c) => c.status === 'COMPLETED').length;
    const missed = completions.filter((c) => c.status === 'MISSED').length;
    const pending = completions.filter((c) => c.status === 'PENDING').length;

    // Get recent completions
    const recentCompletions = await this.prisma.choreCompletion.findMany({
      where: { occupantId },
      include: { chore: true, schedule: true },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    return {
      total,
      completed,
      missed,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      recentCompletions,
    };
  }

  async getUnitStats(unitId: string) {
    const occupants = await this.prisma.occupant.findMany({
      where: {
        isActive: true,
        tenant: {
          room: { unitId },
          isActive: true,
        },
      },
      include: {
        tenant: { include: { room: true } },
        choreCompletions: true,
      },
    });

    const leaderboard = occupants
      .map((occupant) => {
        const total = occupant.choreCompletions.length;
        const completed = occupant.choreCompletions.filter(
          (c) => c.status === 'COMPLETED',
        ).length;

        return {
          id: occupant.id,
          name: occupant.name,
          roomNumber: occupant.tenant.room.roomNumber,
          choreDay: occupant.choreDay,
          total,
          completed,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.completionRate - a.completionRate);

    // Overall unit stats
    const allCompletions = occupants.flatMap((o) => o.choreCompletions);
    const totalChores = allCompletions.length;
    const completedChores = allCompletions.filter(
      (c) => c.status === 'COMPLETED',
    ).length;
    const missedChores = allCompletions.filter(
      (c) => c.status === 'MISSED',
    ).length;

    return {
      totalOccupants: occupants.length,
      totalChores,
      completedChores,
      missedChores,
      overallCompletionRate:
        totalChores > 0 ? Math.round((completedChores / totalChores) * 100) : 0,
      leaderboard,
    };
  }
}
