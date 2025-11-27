import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { RespondSwapDto } from './dto/respond-swap.dto';

@Injectable()
export class SwapsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(requesterId: string, dto: CreateSwapRequestDto) {
    // Verify requester and target exist
    const requester = await this.prisma.occupant.findUnique({
      where: { id: requesterId },
      include: { tenant: true },
    });

    const target = await this.prisma.occupant.findUnique({
      where: { id: dto.targetId },
      include: { tenant: true },
    });

    if (!requester || !target) {
      throw new NotFoundException('Occupant not found');
    }

    // Verify schedule exists
    const schedule = await this.prisma.choreSchedule.findUnique({
      where: { weekId: dto.weekId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found for this week');
    }

    // Check for existing pending request
    const existing = await this.prisma.swapRequest.findFirst({
      where: {
        requesterId,
        targetId: dto.targetId,
        scheduleId: schedule.id,
        status: 'PENDING',
      },
    });

    if (existing) {
      throw new BadRequestException('A swap request already exists');
    }

    const swapRequest = await this.prisma.swapRequest.create({
      data: {
        requesterId,
        targetId: dto.targetId,
        scheduleId: schedule.id,
        reason: dto.reason,
      },
      include: {
        requester: true,
        target: true,
        schedule: true,
      },
    });

    // Notify target
    await this.notificationsService.createSwapRequestNotification(
      target.tenant.id,
      requester.name,
      target.name,
      dto.weekId,
    );

    return swapRequest;
  }

  async findAll(occupantId: string) {
    return this.prisma.swapRequest.findMany({
      where: {
        OR: [{ requesterId: occupantId }, { targetId: occupantId }],
      },
      include: {
        requester: true,
        target: true,
        schedule: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respond(id: string, dto: RespondSwapDto) {
    const swapRequest = await this.prisma.swapRequest.findUnique({
      where: { id },
      include: {
        requester: { include: { tenant: true } },
        target: { include: { tenant: true } },
        schedule: true,
      },
    });

    if (!swapRequest) {
      throw new NotFoundException('Swap request not found');
    }

    if (swapRequest.status !== 'PENDING') {
      throw new BadRequestException('Swap request is no longer pending');
    }

    if (dto.approved) {
      // Swap the chore days for this week by swapping completion records
      await this.prisma.$transaction([
        // Update swap request status
        this.prisma.swapRequest.update({
          where: { id },
          data: { status: 'APPROVED', respondedAt: new Date() },
        }),
        // Swap completion records
        this.prisma.choreCompletion.updateMany({
          where: {
            scheduleId: swapRequest.scheduleId,
            occupantId: swapRequest.requesterId,
          },
          data: { occupantId: swapRequest.targetId },
        }),
        this.prisma.choreCompletion.updateMany({
          where: {
            scheduleId: swapRequest.scheduleId,
            occupantId: swapRequest.targetId,
          },
          data: { occupantId: swapRequest.requesterId },
        }),
      ]);

      // Notify requester of approval
      await this.notificationsService.createSwapResponseNotification(
        swapRequest.requester.tenant.id,
        swapRequest.target.name,
        true,
      );
    } else {
      await this.prisma.swapRequest.update({
        where: { id },
        data: { status: 'REJECTED', respondedAt: new Date() },
      });

      // Notify requester of rejection
      await this.notificationsService.createSwapResponseNotification(
        swapRequest.requester.tenant.id,
        swapRequest.target.name,
        false,
      );
    }

    return this.prisma.swapRequest.findUnique({
      where: { id },
      include: { requester: true, target: true, schedule: true },
    });
  }

  async cancel(id: string, requesterId: string) {
    const swapRequest = await this.prisma.swapRequest.findUnique({
      where: { id },
    });

    if (!swapRequest) {
      throw new NotFoundException('Swap request not found');
    }

    if (swapRequest.requesterId !== requesterId) {
      throw new BadRequestException('Only the requester can cancel');
    }

    if (swapRequest.status !== 'PENDING') {
      throw new BadRequestException('Swap request is no longer pending');
    }

    return this.prisma.swapRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
