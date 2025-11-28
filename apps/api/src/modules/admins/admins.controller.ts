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
import { JwtPayload } from '../auth/auth.service';

@Controller('admins')
@UseGuards(JwtAuthGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

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

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminsService.update(id, dto, user.adminRole!);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.adminsService.remove(id, user.adminRole!, user.sub);
  }
}
