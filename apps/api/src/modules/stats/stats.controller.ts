import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  @UseGuards(AdminGuard)
  getDashboardStats(@CurrentUser() user: JwtPayload) {
    return this.statsService.getDashboardStats(user.adminRole, user.unitIds);
  }

  @Get('occupant/:id')
  getOccupantStats(@Param('id') id: string) {
    return this.statsService.getOccupantStats(id);
  }

  @Get('unit/:id')
  getUnitStats(@Param('id') id: string) {
    return this.statsService.getUnitStats(id);
  }
}
