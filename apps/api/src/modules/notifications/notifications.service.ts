import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';
import { NotificationType, Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async create(
    tenantId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.notification.create({
      data: {
        tenantId,
        type,
        title,
        message,
        metadata,
      },
    });
  }

  async findByTenant(tenantId: string, onlyUnread = false) {
    return this.prisma.notification.findMany({
      where: {
        tenantId,
        ...(onlyUnread && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(tenantId: string) {
    return this.prisma.notification.updateMany({
      where: { tenantId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(tenantId: string) {
    return this.prisma.notification.count({
      where: { tenantId, isRead: false },
    });
  }

  async createSwapRequestNotification(
    tenantId: string,
    requesterName: string,
    targetName: string,
    weekId: string,
  ) {
    const notification = await this.create(
      tenantId,
      'SWAP_REQUEST_RECEIVED',
      'Swap Request',
      `${requesterName} wants to swap chore days with you for ${weekId}`,
      { requesterName, weekId },
    );

    // Also send email
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (tenant) {
      await this.emailService.sendSwapRequest(
        tenant.email,
        requesterName,
        targetName,
        weekId,
      );
    }

    return notification;
  }

  async createSwapResponseNotification(
    tenantId: string,
    responderName: string,
    approved: boolean,
  ) {
    const type = approved ? 'SWAP_REQUEST_APPROVED' : 'SWAP_REQUEST_REJECTED';
    const title = approved ? 'Swap Approved' : 'Swap Rejected';
    const message = approved
      ? `${responderName} approved your swap request`
      : `${responderName} rejected your swap request`;

    return this.create(tenantId, type, title, message, {
      responderName,
      approved,
    });
  }

  async createChoreReminderNotification(
    tenantId: string,
    occupantName: string,
    choreDate: string,
  ) {
    const notification = await this.create(
      tenantId,
      'CHORE_REMINDER',
      'Chore Reminder',
      `Hi ${occupantName}, your chores are due on ${choreDate}`,
      { occupantName, choreDate },
    );

    // Also send email
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (tenant) {
      await this.emailService.sendChoreReminder(
        tenant.email,
        occupantName,
        choreDate,
      );
    }

    return notification;
  }

  async createRequestReceivedNotification(
    tenantId: string,
    requestType: string,
    requestId: string,
  ) {
    const typeLabel = requestType === 'CLEANING_SUPPLIES' ? 'cleaning supplies' : 'maintenance issue';
    return this.create(
      tenantId,
      'REQUEST_RECEIVED',
      'Request Received',
      `Your ${typeLabel} request has been received and will be addressed soon.`,
      { requestType, requestId },
    );
  }

  async sendRequestEmailToAdmin(
    adminEmail: string,
    tenant: any,
    request: any,
  ) {
    return this.emailService.sendRequestToAdmin(adminEmail, tenant, request);
  }

  async createRequestResolvedNotification(
    tenantId: string,
    requestType: string,
    notes?: string,
  ) {
    const typeLabel = requestType === 'CLEANING_SUPPLIES' ? 'cleaning supplies' : 'maintenance issue';
    const message = notes
      ? `Your ${typeLabel} request has been resolved. ${notes}`
      : `Your ${typeLabel} request has been resolved.`;

    const notification = await this.create(
      tenantId,
      'REQUEST_RESOLVED',
      'Request Resolved',
      message,
      { requestType, notes },
    );

    // Also send email
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        room: true,
      },
    });
    if (tenant) {
      await this.emailService.sendRequestResolved(tenant.email, {
        type: requestType,
        description: '',
        notes,
      });
    }

    return notification;
  }
}
