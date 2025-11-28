import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller()
export class SpaController {
  @Get('*')
  serveSpa(@Res() res: Response) {
    res.sendFile(join(__dirname, '..', '..', '..', 'web', 'dist', 'index.html'));
  }
}
