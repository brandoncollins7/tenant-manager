import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { NotificationScheduler } from './notification.scheduler';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, NotificationScheduler],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
