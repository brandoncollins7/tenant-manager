import { Module } from '@nestjs/common';
import { SwapsController } from './swaps.controller';
import { SwapsService } from './swaps.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SwapsController],
  providers: [SwapsService],
  exports: [SwapsService],
})
export class SwapsModule {}
