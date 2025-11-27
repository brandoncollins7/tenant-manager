import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('occupant/:id')
  getOccupantStats(@Param('id') id: string) {
    return this.statsService.getOccupantStats(id);
  }

  @Get('unit/:id')
  getUnitStats(@Param('id') id: string) {
    return this.statsService.getUnitStats(id);
  }
}
