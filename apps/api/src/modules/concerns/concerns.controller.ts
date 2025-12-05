import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConcernsService } from './concerns.service';
import { CreateConcernDto } from './dto/create-concern.dto';
import { UpdateConcernDto } from './dto/update-concern.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ConcernStatus, ConcernType } from '@prisma/client';

@Controller('concerns')
@UseGuards(JwtAuthGuard)
export class ConcernsController {
  constructor(private readonly concernsService: ConcernsService) {}

  @Post()
  create(
    @Query('reporterId') reporterId: string,
    @Body() dto: CreateConcernDto,
  ) {
    return this.concernsService.create(reporterId, dto);
  }

  @Get()
  @UseGuards(AdminGuard)
  findAll(
    @Query('reporterId') reporterId?: string,
    @Query('reportedId') reportedId?: string,
    @Query('unitId') unitId?: string,
    @Query('status') status?: ConcernStatus,
    @Query('type') type?: ConcernType,
  ) {
    return this.concernsService.findAll({
      reporterId,
      reportedId,
      unitId,
      status,
      type,
    });
  }

  @Get('my-concerns')
  findMyConcerns(@Query('reporterId') reporterId: string) {
    // Tenants can only see concerns they have reported
    return this.concernsService.findAll({ reporterId });
  }

  @Get('reportable-tenants')
  getReportableTenants(@Query('tenantId') tenantId: string) {
    // Get other tenants in the same unit that can be reported
    return this.concernsService.getReportableTenants(tenantId);
  }

  @Get('stats')
  @UseGuards(AdminGuard)
  getStats(@Query('unitId') unitId: string) {
    return this.concernsService.getStatsByUnit(unitId);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  findOne(@Param('id') id: string) {
    return this.concernsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Query('resolvedBy') resolvedBy: string,
    @Body() dto: UpdateConcernDto,
  ) {
    return this.concernsService.update(id, resolvedBy, dto);
  }
}
