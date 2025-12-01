import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { NotificationScheduler } from './notification.scheduler';
import {
  EMAIL_PROVIDER,
  ResendProvider,
  MailtrapProvider,
  ConsoleProvider,
} from './email';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    NotificationScheduler,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('EMAIL_PROVIDER') || 'console';
        switch (provider) {
          case 'resend':
            return new ResendProvider(configService);
          case 'mailtrap':
            return new MailtrapProvider(configService);
          default:
            return new ConsoleProvider();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
