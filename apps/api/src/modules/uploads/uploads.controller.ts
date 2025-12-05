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
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
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
  @UseGuards(JwtAuthGuard)
  async getPhoto(
    @CurrentTenant() user: JwtPayload,
    @Param('tenantId') tenantId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Allow access if user is admin OR if user is the tenant who owns the photo
    const userTenantId = user.tenantId || user.sub;
    const isOwner = userTenantId === tenantId;
    const isAdmin = user.isAdmin;

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

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
