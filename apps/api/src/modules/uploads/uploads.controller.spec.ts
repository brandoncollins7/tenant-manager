import { Test, TestingModule } from '@nestjs/testing';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { Response } from 'express';
import { JwtPayload } from '../auth/auth.service';

describe('UploadsController', () => {
  let controller: UploadsController;
  let uploadsService: jest.Mocked<UploadsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [
        {
          provide: UploadsService,
          useValue: {
            savePhoto: jest.fn(),
            getPhoto: jest.fn(),
            deletePhoto: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UploadsController>(UploadsController);
    uploadsService = module.get(UploadsService);
  });

  describe('getPhoto', () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    it('should allow tenant to view their own photo', async () => {
      const user: JwtPayload = {
        sub: 'tenant-123',
        email: 'tenant@example.com',
        isAdmin: false,
        tenantId: 'tenant-123',
      };
      const photoBuffer = Buffer.from('test-image');
      uploadsService.getPhoto.mockResolvedValue(photoBuffer);

      await controller.getPhoto(user, 'tenant-123', 'photo.jpg', mockResponse as Response);

      expect(uploadsService.getPhoto).toHaveBeenCalledWith('tenant-123/photo.jpg');
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      });
      expect(mockResponse.send).toHaveBeenCalledWith(photoBuffer);
    });

    it('should allow admin to view any tenant photo', async () => {
      const user: JwtPayload = {
        sub: 'admin-123',
        email: 'admin@example.com',
        isAdmin: true,
      };
      const photoBuffer = Buffer.from('test-image');
      uploadsService.getPhoto.mockResolvedValue(photoBuffer);

      await controller.getPhoto(user, 'tenant-456', 'photo.jpg', mockResponse as Response);

      expect(uploadsService.getPhoto).toHaveBeenCalledWith('tenant-456/photo.jpg');
      expect(mockResponse.send).toHaveBeenCalledWith(photoBuffer);
    });

    it('should deny tenant from viewing another tenant photo', async () => {
      const user: JwtPayload = {
        sub: 'tenant-123',
        email: 'tenant@example.com',
        isAdmin: false,
        tenantId: 'tenant-123',
      };

      await controller.getPhoto(user, 'tenant-456', 'photo.jpg', mockResponse as Response);

      expect(uploadsService.getPhoto).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    });

    it('should return 404 when photo not found', async () => {
      const user: JwtPayload = {
        sub: 'tenant-123',
        email: 'tenant@example.com',
        isAdmin: false,
        tenantId: 'tenant-123',
      };
      uploadsService.getPhoto.mockRejectedValue(new Error('File not found'));

      await controller.getPhoto(user, 'tenant-123', 'nonexistent.jpg', mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Image not found' });
    });

    it('should use sub as tenantId when tenantId is not set', async () => {
      const user: JwtPayload = {
        sub: 'tenant-123',
        email: 'tenant@example.com',
        isAdmin: false,
        // tenantId not set - should fall back to sub
      };
      const photoBuffer = Buffer.from('test-image');
      uploadsService.getPhoto.mockResolvedValue(photoBuffer);

      await controller.getPhoto(user, 'tenant-123', 'photo.jpg', mockResponse as Response);

      expect(uploadsService.getPhoto).toHaveBeenCalledWith('tenant-123/photo.jpg');
      expect(mockResponse.send).toHaveBeenCalledWith(photoBuffer);
    });
  });
});
