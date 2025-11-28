import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChoresService } from './chores.service';
import { CompleteChoreDto } from './dto/complete-chore.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
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
  getScheduleByWeek(
    @Param('weekId') weekId: string,
    @Query('unitId') unitId?: string,
  ) {
    return this.choresService.getScheduleByWeek(weekId, unitId);
  }

  @Get('schedule-view')
  getWeeklyScheduleView(@Query('unitId') unitId: string) {
    return this.choresService.getWeeklyScheduleView(unitId);
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

  // Admin endpoints
  @Post('definitions')
  @UseGuards(AdminGuard)
  createChoreDefinition(@Body() dto: { name: string; description?: string; unitId: string; sortOrder?: number }) {
    return this.choresService.createChoreDefinition(dto);
  }

  @Patch('definitions/:id')
  @UseGuards(AdminGuard)
  updateChoreDefinition(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; sortOrder?: number; isActive?: boolean },
  ) {
    return this.choresService.updateChoreDefinition(id, dto);
  }

  @Delete('definitions/:id')
  @UseGuards(AdminGuard)
  deleteChoreDefinition(@Param('id') id: string) {
    return this.choresService.deleteChoreDefinition(id);
  }
}
