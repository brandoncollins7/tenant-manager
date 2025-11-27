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
import { OccupantsService } from './occupants.service';
import { CreateOccupantDto } from './dto/create-occupant.dto';
import { UpdateOccupantDto } from './dto/update-occupant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { JwtPayload } from '../auth/auth.service';

@Controller('occupants')
@UseGuards(JwtAuthGuard)
export class OccupantsController {
  constructor(private readonly occupantsService: OccupantsService) {}

  @Post()
  create(@CurrentTenant() user: JwtPayload, @Body() dto: CreateOccupantDto) {
    if (!user.tenantId) {
      throw new Error('Only tenants can add occupants');
    }
    return this.occupantsService.create(user.tenantId, dto);
  }

  @Get()
  findByTenant(@CurrentTenant() user: JwtPayload) {
    if (!user.tenantId) {
      throw new Error('Only tenants can view occupants');
    }
    return this.occupantsService.findByTenant(user.tenantId);
  }

  @Get('available-days')
  getAvailableDays(@Query('unitId') unitId: string) {
    return this.occupantsService.getAvailableDays(unitId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.occupantsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOccupantDto) {
    return this.occupantsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.occupantsService.remove(id);
  }
}
