import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { NotificationScheduler } from './notification.scheduler';
import { DevEmailController } from './dev-email.controller';
import {
  EMAIL_PROVIDER,
  ResendProvider,
  MailtrapProvider,
  ConsoleProvider,
  BrowserProvider,
} from './email';

const logger = new Logger('EmailProviderFactory');

// Include DevEmailController only in non-production
const controllers =
  process.env.NODE_ENV === 'production'
    ? [NotificationsController]
    : [NotificationsController, DevEmailController];

@Module({
  controllers,
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
          case 'browser':
            logger.log('Creating BrowserProvider (dev toast notifications)');
            return new BrowserProvider();
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
