import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRoleType } from '../../common/constants/admin-roles';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(adminRole?: AdminRoleType, unitIds?: string[]) {
    // Build unit filter based on admin role
    const unitFilter =
      adminRole === 'SUPER_ADMIN' ? {} : { unitId: { in: unitIds || [] } };

    // Get pending requests count and list
    const [pendingRequestsCount, pendingRequests] = await Promise.all([
      this.prisma.request.count({
        where: {
          status: 'PENDING',
          ...unitFilter,
        },
      }),
      this.prisma.request.findMany({
        where: {
          status: 'PENDING',
          ...unitFilter,
        },
        include: {
          tenant: {
            select: {
              email: true,
              occupants: {
                where: { isActive: true },
                select: { name: true },
                take: 1,
              },
            },
          },
          unit: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Get overdue chores (PENDING status from past weeks)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build occupant filter for unit-scoped access
    const occupantFilter =
      adminRole === 'SUPER_ADMIN'
        ? {}
        : {
            tenant: {
              room: {
                unitId: { in: unitIds || [] },
              },
            },
          };

    const [overdueChoresCount, overdueChores] = await Promise.all([
      this.prisma.choreCompletion.count({
        where: {
          status: 'PENDING',
          schedule: {
            weekStart: { lt: today },
          },
          occupant: {
            isActive: true,
            ...occupantFilter,
          },
        },
      }),
      this.prisma.choreCompletion.findMany({
        where: {
          status: 'PENDING',
          schedule: {
            weekStart: { lt: today },
          },
          occupant: {
            isActive: true,
            ...occupantFilter,
          },
        },
        include: {
          occupant: {
            select: {
              name: true,
              tenant: {
                select: {
                  room: {
                    select: {
                      roomNumber: true,
                      unit: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
          chore: {
            select: { name: true },
          },
          schedule: {
            select: { weekId: true, weekStart: true },
          },
        },
        orderBy: { schedule: { weekStart: 'desc' } },
        take: 5,
      }),
    ]);

    // Get completion rate
    const completions = await this.prisma.choreCompletion.findMany({
      where: {
        occupant: {
          isActive: true,
          ...occupantFilter,
        },
      },
      select: { status: true },
    });

    const totalCompletions = completions.length;
    const completedCount = completions.filter(
      (c) => c.status === 'COMPLETED',
    ).length;
    const completionRate =
      totalCompletions > 0
        ? Math.round((completedCount / totalCompletions) * 100)
        : 0;

    return {
      stats: {
        pendingRequests: pendingRequestsCount,
        overdueChores: overdueChoresCount,
        completionRate,
      },
      pendingRequests: pendingRequests.map((r) => ({
        id: r.id,
        type: r.type,
        description: r.description,
        createdAt: r.createdAt,
        tenantName: r.tenant.occupants[0]?.name || r.tenant.email,
        unitName: r.unit.name,
      })),
      overdueChores: overdueChores.map((c) => ({
        id: c.id,
        occupantName: c.occupant.name,
        choreName: c.chore.name,
        weekId: c.schedule.weekId,
        weekStart: c.schedule.weekStart,
        roomNumber: c.occupant.tenant?.room?.roomNumber,
        unitName: c.occupant.tenant?.room?.unit?.name,
      })),
    };
  }

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
      .filter((occupant) => occupant.tenant.room !== null)
      .map((occupant) => {
        const total = occupant.choreCompletions.length;
        const completed = occupant.choreCompletions.filter(
          (c) => c.status === 'COMPLETED',
        ).length;

        return {
          id: occupant.id,
          name: occupant.name,
          roomNumber: occupant.tenant.room!.roomNumber,
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
