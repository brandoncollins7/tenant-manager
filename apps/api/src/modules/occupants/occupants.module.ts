import { Module } from '@nestjs/common';
import { OccupantsController } from './occupants.controller';
import { OccupantsService } from './occupants.service';

@Module({
  controllers: [OccupantsController],
  providers: [OccupantsService],
  exports: [OccupantsService],
})
export class OccupantsModule {}
