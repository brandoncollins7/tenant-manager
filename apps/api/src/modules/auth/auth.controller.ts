import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RequestMagicLinkDto } from './dto/request-magic-link.dto';
import { VerifyMagicLinkDto } from './dto/verify-magic-link.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { JwtPayload } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-link')
  async requestMagicLink(@Body() dto: RequestMagicLinkDto) {
    return this.authService.requestMagicLink(dto.email);
  }

  @Post('verify')
  async verifyMagicLink(@Body() dto: VerifyMagicLinkDto) {
    return this.authService.verifyMagicLink(dto.token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentTenant() user: JwtPayload) {
    return this.authService.getMe(user.sub, user.isAdmin);
  }
}
