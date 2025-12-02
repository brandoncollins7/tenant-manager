import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { AdminRole } from '../../common/constants/admin-roles';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-jwt-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('should return payload for valid JWT with sub', async () => {
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        isAdmin: false,
        tenantId: 'tenant-1',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual(payload);
    });

    it('should return payload for admin JWT', async () => {
      const payload = {
        sub: 'admin-1',
        email: 'admin@example.com',
        isAdmin: true,
        adminId: 'admin-1',
        adminRole: AdminRole.SUPER_ADMIN,
        unitIds: ['unit-1'],
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException when sub is missing', async () => {
      const payload = {
        email: 'test@example.com',
        isAdmin: false,
      } as any;

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when sub is empty string', async () => {
      const payload = {
        sub: '',
        email: 'test@example.com',
        isAdmin: false,
      } as any;

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
