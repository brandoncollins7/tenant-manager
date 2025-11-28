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
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { ResolveRequestDto } from './dto/resolve-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RequestStatus, RequestType } from '@prisma/client';

@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  create(
    @Query('tenantId') tenantId: string,
    @Body() dto: CreateRequestDto,
  ) {
    return this.requestsService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('unitId') unitId?: string,
    @Query('status') status?: RequestStatus,
    @Query('type') type?: RequestType,
  ) {
    return this.requestsService.findAll({
      tenantId,
      unitId,
      status,
      type,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Patch(':id/resolve')
  resolve(
    @Param('id') id: string,
    @Query('resolvedBy') resolvedBy: string,
    @Body() dto: ResolveRequestDto,
  ) {
    return this.requestsService.resolve(id, resolvedBy, dto);
  }
}
