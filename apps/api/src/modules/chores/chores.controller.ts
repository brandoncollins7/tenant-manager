import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChoresService } from './chores.service';
import { CompleteChoreDto } from './dto/complete-chore.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { JwtPayload } from '../auth/auth.service';

@Controller('chores')
@UseGuards(JwtAuthGuard)
export class ChoresController {
  constructor(private readonly choresService: ChoresService) {}

  @Get()
  getChoreDefinitions(@Query('unitId') unitId: string) {
    return this.choresService.getChoreDefinitions(unitId);
  }

  @Get('schedule')
  getCurrentSchedule(@Query('unitId') unitId: string) {
    return this.choresService.getCurrentSchedule(unitId);
  }

  @Get('schedule/:weekId')
  getScheduleByWeek(@Param('weekId') weekId: string) {
    return this.choresService.getScheduleByWeek(weekId);
  }

  @Get('today')
  getTodaysChores(@CurrentTenant() user: JwtPayload) {
    if (!user.tenantId) {
      throw new Error('Only tenants can view today\'s chores');
    }
    return this.choresService.getTodaysChores(user.tenantId);
  }

  @Post(':id/complete')
  markComplete(@Param('id') id: string, @Body() dto: CompleteChoreDto) {
    return this.choresService.markComplete(id, dto);
  }

  @Get('history')
  getCompletionHistory(
    @Query('occupantId') occupantId: string,
    @Query('limit') limit?: number,
  ) {
    return this.choresService.getCompletionHistory(occupantId, limit);
  }
}
