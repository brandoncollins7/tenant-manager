import { Logger, Module } from '@nestjs/common';
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

const logger = new Logger('EmailProviderFactory');

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
        logger.log(`EMAIL_PROVIDER env var = "${provider}"`);
        switch (provider) {
          case 'resend':
            logger.log('Creating ResendProvider');
            return new ResendProvider(configService);
          case 'mailtrap':
            logger.log('Creating MailtrapProvider');
            return new MailtrapProvider(configService);
          default:
            logger.log('Creating ConsoleProvider (default)');
            return new ConsoleProvider();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
