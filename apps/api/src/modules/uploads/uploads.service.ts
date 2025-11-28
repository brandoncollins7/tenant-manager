import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private readonly uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
  }

  async onModuleInit() {
    try {
      // Test write access to upload directory
      const testFile = path.join(this.uploadDir, '.health-check');
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.writeFile(testFile, 'OK');
      await fs.unlink(testFile);
      this.logger.log(`✅ Upload directory accessible: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(
        `❌ Upload directory not accessible: ${this.uploadDir}`,
        error.stack,
      );
      throw new Error(`Upload directory ${this.uploadDir} is not writable`);
    }
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
