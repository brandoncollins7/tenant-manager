import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UploadsService } from './uploads.service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock sharp
jest.mock('sharp', () => {
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined),
  }));
});

// Mock fs
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('test-image')),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'UPLOAD_DIR') return './test-uploads';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('savePhoto', () => {
    it('should save and process a photo', async () => {
      const mockFile = {
        buffer: Buffer.from('test-image'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const result = await service.savePhoto(mockFile, 'tenant-1');

      // Result should be in format: tenantId/timestamp-hash.jpg
      expect(result).toMatch(/^tenant-1\/\d+-[a-f0-9]+\.jpg$/);
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('tenant-1'),
        { recursive: true },
      );
    });

    it('should create unique filenames', async () => {
      const mockFile = {
        buffer: Buffer.from('test-image'),
      } as Express.Multer.File;

      const result1 = await service.savePhoto(mockFile, 'tenant-1');
      const result2 = await service.savePhoto(mockFile, 'tenant-1');

      expect(result1).not.toBe(result2);
    });
  });

  describe('getPhoto', () => {
    it('should read a photo file', async () => {
      const result = await service.getPhoto('tenant-1/photo.jpg');

      expect(result).toEqual(Buffer.from('test-image'));
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join('./test-uploads', 'tenant-1/photo.jpg'),
      );
    });
  });

  describe('deletePhoto', () => {
    it('should delete a photo file', async () => {
      await service.deletePhoto('tenant-1/photo.jpg');

      expect(fs.unlink).toHaveBeenCalledWith(
        path.join('./test-uploads', 'tenant-1/photo.jpg'),
      );
    });

    it('should handle deletion errors gracefully', async () => {
      (fs.unlink as jest.Mock).mockRejectedValueOnce(new Error('File not found'));

      // Should not throw
      await expect(service.deletePhoto('tenant-1/nonexistent.jpg')).resolves.not.toThrow();
    });
  });
});
