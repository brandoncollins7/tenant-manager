import { Module } from '@nestjs/common';
import { ChoresController } from './chores.controller';
import { ChoresService } from './chores.service';
import { ScheduleService } from './schedule.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [ChoresController],
  providers: [ChoresService, ScheduleService],
  exports: [ChoresService, ScheduleService],
})
export class ChoresModule {}
