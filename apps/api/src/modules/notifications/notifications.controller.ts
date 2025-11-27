import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { JwtPayload } from '../auth/auth.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentTenant() user: JwtPayload,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    if (!user.tenantId) {
      throw new Error('Only tenants have notifications');
    }
    return this.notificationsService.findByTenant(
      user.tenantId,
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  getUnreadCount(@CurrentTenant() user: JwtPayload) {
    if (!user.tenantId) {
      return { count: 0 };
    }
    return this.notificationsService.getUnreadCount(user.tenantId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentTenant() user: JwtPayload) {
    if (!user.tenantId) {
      throw new Error('Only tenants have notifications');
    }
    return this.notificationsService.markAllAsRead(user.tenantId);
  }
}
