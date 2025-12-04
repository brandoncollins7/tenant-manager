import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService, JwtPayload } from '../auth/auth.service';

@Controller('admins')
@UseGuards(JwtAuthGuard)
export class AdminsController {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  create(@Body() dto: CreateAdminDto) {
    return this.adminsService.create(dto);
  }

  @Get()
  @UseGuards(SuperAdminGuard)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.adminsService.findAll(user.adminRole!);
  }

  @Get('by-unit/:unitId')
  @UseGuards(SuperAdminGuard)
  findByUnit(@Param('unitId') unitId: string, @CurrentUser() user: JwtPayload) {
    return this.adminsService.findByUnit(unitId, user.adminRole!);
  }

  @Get('available-for-unit/:unitId')
  @UseGuards(SuperAdminGuard)
  findAvailableForUnit(
    @Param('unitId') unitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminsService.findAvailableForUnit(unitId, user.adminRole!);
  }

  @Post(':id/impersonate')
  @UseGuards(SuperAdminGuard)
  impersonate(@Param('id') id: string) {
    return this.authService.createAdminImpersonationLink(id);
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminsService.update(id, dto, user.adminRole!);
  }

  @Post(':adminId/assign-unit/:unitId')
  @UseGuards(SuperAdminGuard)
  assignToUnit(
    @Param('adminId') adminId: string,
    @Param('unitId') unitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminsService.assignToUnit(adminId, unitId, user.adminRole!);
  }

  @Delete(':adminId/unassign-unit/:unitId')
  @UseGuards(SuperAdminGuard)
  removeFromUnit(
    @Param('adminId') adminId: string,
    @Param('unitId') unitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminsService.removeFromUnit(adminId, unitId, user.adminRole!);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.adminsService.remove(id, user.adminRole!, user.sub);
  }
}
