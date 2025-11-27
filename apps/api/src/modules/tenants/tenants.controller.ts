import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { UploadsService } from '../uploads/uploads.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard, AdminGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  findAll(@Query('unitId') unitId?: string) {
    return this.tenantsService.findAll(unitId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }

  @Get('rooms/available')
  getAvailableRooms() {
    return this.tenantsService.getAvailableRooms();
  }

  @Post(':id/lease')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          return callback(
            new BadRequestException('Only PDF files are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadLease(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const filename = await this.uploadsService.saveLease(file, id);
    await this.tenantsService.updateLeaseDocument(id, filename);

    return { filename, path: `/api/tenants/${id}/lease` };
  }

  @Get(':id/lease')
  async getLease(@Param('id') id: string, @Res() res: Response) {
    const tenant = await this.tenantsService.findOne(id);

    if (!tenant.leaseDocument) {
      return res.status(404).json({ message: 'No lease document found' });
    }

    try {
      const buffer = await this.uploadsService.getLease(tenant.leaseDocument);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="lease-${tenant.room.roomNumber}.pdf"`,
      });
      res.send(buffer);
    } catch {
      res.status(404).json({ message: 'Lease document not found' });
    }
  }
}
