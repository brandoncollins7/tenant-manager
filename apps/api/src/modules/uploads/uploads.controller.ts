import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { UnitAccessGuard } from '../../common/guards/unit-access.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { UnitScoped } from '../../common/decorators/unit-scoped.decorator';
import { JwtPayload } from '../auth/auth.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('photo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp|heic|heif)$/)) {
          return callback(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadPhoto(
    @CurrentTenant() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const tenantId = user.tenantId || user.sub;
    const filename = await this.uploadsService.savePhoto(file, tenantId);

    return { filename, path: `/api/uploads/${filename}` };
  }

  @Get(':tenantId/:filename')
  @UseGuards(JwtAuthGuard, AdminGuard, UnitAccessGuard)
  @UnitScoped('photo', 'tenantId')
  async getPhoto(
    @Param('tenantId') tenantId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const filepath = `${tenantId}/${filename}`;
      const buffer = await this.uploadsService.getPhoto(filepath);

      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      });
      res.send(buffer);
    } catch {
      res.status(404).json({ message: 'Image not found' });
    }
  }
}
