import { Module } from '@nestjs/common';
import { ConcernsController } from './concerns.controller';
import { ConcernsService } from './concerns.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ConcernsController],
  providers: [ConcernsService],
  exports: [ConcernsService],
})
export class ConcernsModule {}
