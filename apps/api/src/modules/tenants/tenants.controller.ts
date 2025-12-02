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
import { UploadLeaseDto } from './dto/upload-lease.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { UnitAccessGuard } from '../../common/guards/unit-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UnitScoped } from '../../common/decorators/unit-scoped.decorator';
import { UploadsService } from '../uploads/uploads.service';
import { AuthService, JwtPayload } from '../auth/auth.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard, AdminGuard, UnitAccessGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly uploadsService: UploadsService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  findAll(@Query('unitId') unitId?: string, @CurrentUser() user?: JwtPayload) {
    return this.tenantsService.findAll(unitId, user?.adminRole, user?.unitIds);
  }

  // Static routes must come BEFORE parameterized routes
  @Get('rooms/available')
  getAvailableRooms(@Query('unitId') unitId?: string) {
    return this.tenantsService.getAvailableRooms(unitId);
  }

  @Get('unassigned')
  getUnassignedTenants() {
    return this.tenantsService.getUnassignedTenants();
  }

  @Get(':id')
  @UnitScoped('tenant')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @UnitScoped('tenant')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @UnitScoped('tenant')
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }

  @Post(':id/send-login-link')
  @UnitScoped('tenant')
  async sendLoginLink(@Param('id') id: string) {
    const tenant = await this.tenantsService.findOne(id);
    return this.authService.requestMagicLink(tenant.email);
  }

  @Post(':id/lease')
  @UnitScoped('tenant')
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
    @Body() dto: UploadLeaseDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const filename = await this.uploadsService.saveLease(file, id);
    const leaseDoc = await this.tenantsService.uploadLeaseVersion(
      id,
      filename,
      adminEmail,
      dto.notes,
    );

    return {
      version: leaseDoc.version,
      filename: leaseDoc.filename,
      uploadedBy: leaseDoc.uploadedBy,
      uploadedAt: leaseDoc.uploadedAt,
      notes: leaseDoc.notes,
    };
  }

  @Get(':id/leases')
  @UnitScoped('tenant')
  async getLeaseHistory(@Param('id') id: string) {
    return this.tenantsService.getLeaseHistory(id);
  }

  @Get(':id/leases/:version')
  @UnitScoped('tenant')
  async getLeaseVersion(
    @Param('id') id: string,
    @Param('version') version: string,
    @Res() res: Response,
  ) {
    const leaseDoc = await this.tenantsService.getLeaseVersion(
      id,
      parseInt(version, 10),
    );

    if (!leaseDoc) {
      return res.status(404).json({ message: 'Lease version not found' });
    }

    try {
      const buffer = await this.uploadsService.getLease(leaseDoc.filename);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="lease-v${version}.pdf"`,
      });
      res.send(buffer);
    } catch {
      res.status(404).json({ message: 'Lease file not found' });
    }
  }

  @Get(':id/lease')
  @UnitScoped('tenant')
  async getCurrentLease(@Param('id') id: string, @Res() res: Response) {
    const leaseDoc = await this.tenantsService.getCurrentLease(id);

    if (!leaseDoc) {
      return res.status(404).json({ message: 'No lease document found' });
    }

    try {
      const buffer = await this.uploadsService.getLease(leaseDoc.filename);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="lease-current.pdf"`,
      });
      res.send(buffer);
    } catch {
      res.status(404).json({ message: 'Lease file not found' });
    }
  }
}
