import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
  }

  async savePhoto(
    file: Express.Multer.File,
    tenantId: string,
  ): Promise<string> {
    const hash = crypto.randomBytes(8).toString('hex');
    const filename = `${tenantId}/${Date.now()}-${hash}.jpg`;
    const filepath = path.join(this.uploadDir, filename);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });

    // Process and save image
    await sharp(file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(filepath);

    this.logger.log(`Photo saved: ${filename}`);
    return filename;
  }

  async getPhoto(filename: string): Promise<Buffer> {
    const filepath = path.join(this.uploadDir, filename);
    return fs.readFile(filepath);
  }

  async deletePhoto(filename: string): Promise<void> {
    const filepath = path.join(this.uploadDir, filename);
    try {
      await fs.unlink(filepath);
      this.logger.log(`Photo deleted: ${filename}`);
    } catch (error) {
      this.logger.warn(`Failed to delete photo: ${filename}`);
    }
  }

  async saveLease(
    file: Express.Multer.File,
    tenantId: string,
  ): Promise<string> {
    const hash = crypto.randomBytes(8).toString('hex');
    const filename = `${tenantId}/leases/${Date.now()}-${hash}.pdf`;
    const filepath = path.join(this.uploadDir, filename);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });

    // Save PDF directly (no processing needed)
    await fs.writeFile(filepath, file.buffer);

    this.logger.log(`Lease saved: ${filename}`);
    return filename;
  }

  async getLease(filename: string): Promise<Buffer> {
    const filepath = path.join(this.uploadDir, filename);
    return fs.readFile(filepath);
  }
}
