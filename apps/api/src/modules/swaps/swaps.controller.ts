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
import { SwapsService } from './swaps.service';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { RespondSwapDto } from './dto/respond-swap.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@Controller('swaps')
@UseGuards(JwtAuthGuard)
export class SwapsController {
  constructor(private readonly swapsService: SwapsService) {}

  @Post()
  create(
    @Query('requesterId') requesterId: string,
    @Body() dto: CreateSwapRequestDto,
  ) {
    return this.swapsService.create(requesterId, dto);
  }

  @Get()
  findAll(@Query('occupantId') occupantId: string) {
    return this.swapsService.findAll(occupantId);
  }

  @Patch(':id/respond')
  respond(@Param('id') id: string, @Body() dto: RespondSwapDto) {
    return this.swapsService.respond(id, dto);
  }

  @Delete(':id')
  cancel(
    @Param('id') id: string,
    @Query('requesterId') requesterId: string,
  ) {
    return this.swapsService.cancel(id, requesterId);
  }
}
