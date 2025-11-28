import { validate } from 'class-validator';
import { CreateTenantDto } from './create-tenant.dto';

describe('CreateTenantDto', () => {
  describe('startDate validation', () => {
    it('should accept valid ISO 8601 datetime string', async () => {
      const dto = new CreateTenantDto();
      dto.email = 'test@example.com';
      dto.roomId = 'd8134499-c5fd-415f-af76-8b0943e8d368';
      dto.primaryOccupantName = 'John Doe';
      dto.choreDay = 0;
      dto.startDate = '2025-11-27T00:00:00.000Z' as any;

      const errors = await validate(dto);
      const startDateErrors = errors.filter((e) => e.property === 'startDate');

      expect(startDateErrors).toHaveLength(0);
    });

    it('should accept ISO 8601 datetime with timezone offset', async () => {
      const dto = new CreateTenantDto();
      dto.email = 'test@example.com';
      dto.roomId = 'd8134499-c5fd-415f-af76-8b0943e8d368';
      dto.primaryOccupantName = 'John Doe';
      dto.choreDay = 0;
      dto.startDate = '2025-11-29T05:00:00.000-05:00' as any;

      const errors = await validate(dto);
      const startDateErrors = errors.filter((e) => e.property === 'startDate');

      expect(startDateErrors).toHaveLength(0);
    });

    it('should accept ISO 8601 date-only format', async () => {
      const dto = new CreateTenantDto();
      dto.email = 'test@example.com';
      dto.roomId = 'd8134499-c5fd-415f-af76-8b0943e8d368';
      dto.primaryOccupantName = 'John Doe';
      dto.choreDay = 0;
      dto.startDate = '2025-11-29' as any;

      const errors = await validate(dto);
      const startDateErrors = errors.filter((e) => e.property === 'startDate');

      expect(startDateErrors).toHaveLength(0);
    });

    it('should reject invalid date format', async () => {
      const dto = new CreateTenantDto();
      dto.email = 'test@example.com';
      dto.roomId = 'd8134499-c5fd-415f-af76-8b0943e8d368';
      dto.primaryOccupantName = 'John Doe';
      dto.choreDay = 0;
      dto.startDate = 'invalid-date' as any;

      const errors = await validate(dto);
      const startDateErrors = errors.filter((e) => e.property === 'startDate');

      expect(startDateErrors.length).toBeGreaterThan(0);
      expect(startDateErrors[0].constraints).toHaveProperty('isIso8601');
    });

    it('should reject empty startDate', async () => {
      const dto = new CreateTenantDto();
      dto.email = 'test@example.com';
      dto.roomId = 'd8134499-c5fd-415f-af76-8b0943e8d368';
      dto.primaryOccupantName = 'John Doe';
      dto.choreDay = 0;
      // startDate is not set

      const errors = await validate(dto);
      const startDateErrors = errors.filter((e) => e.property === 'startDate');

      expect(startDateErrors.length).toBeGreaterThan(0);
      expect(startDateErrors[0].constraints).toHaveProperty('isNotEmpty');
    });
  });

  describe('endDate validation', () => {
    it('should accept valid ISO 8601 datetime string for endDate', async () => {
      const dto = new CreateTenantDto();
      dto.email = 'test@example.com';
      dto.roomId = 'd8134499-c5fd-415f-af76-8b0943e8d368';
      dto.primaryOccupantName = 'John Doe';
      dto.choreDay = 0;
      dto.startDate = '2025-11-27T00:00:00.000Z' as any;
      dto.endDate = '2026-11-27T00:00:00.000Z' as any;

      const errors = await validate(dto);
      const endDateErrors = errors.filter((e) => e.property === 'endDate');

      expect(endDateErrors).toHaveLength(0);
    });

    it('should accept undefined endDate (optional)', async () => {
      const dto = new CreateTenantDto();
      dto.email = 'test@example.com';
      dto.roomId = 'd8134499-c5fd-415f-af76-8b0943e8d368';
      dto.primaryOccupantName = 'John Doe';
      dto.choreDay = 0;
      dto.startDate = '2025-11-27T00:00:00.000Z' as any;
      // endDate is not set

      const errors = await validate(dto);
      const endDateErrors = errors.filter((e) => e.property === 'endDate');

      expect(endDateErrors).toHaveLength(0);
    });

    it('should reject invalid endDate format', async () => {
      const dto = new CreateTenantDto();
      dto.email = 'test@example.com';
      dto.roomId = 'd8134499-c5fd-415f-af76-8b0943e8d368';
      dto.primaryOccupantName = 'John Doe';
      dto.choreDay = 0;
      dto.startDate = '2025-11-27T00:00:00.000Z' as any;
      dto.endDate = 'not-a-date' as any;

      const errors = await validate(dto);
      const endDateErrors = errors.filter((e) => e.property === 'endDate');

      expect(endDateErrors.length).toBeGreaterThan(0);
      expect(endDateErrors[0].constraints).toHaveProperty('isIso8601');
    });
  });

  describe('complete validation', () => {
    it('should validate complete DTO matching frontend payload', async () => {
      // This matches the exact payload from the frontend
      const dto = new CreateTenantDto();
      dto.email = 'brandoncollins@gmail.com';
      dto.phone = '4168903797';
      dto.primaryOccupantName = 'Brandon Collins';
      dto.choreDay = 0;
      dto.startDate = '2025-11-27T00:00:00.000Z' as any;
      dto.roomId = 'd8134499-c5fd-415f-af76-8b0943e8d368';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });
});
