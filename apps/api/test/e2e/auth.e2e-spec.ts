import { createTestApp, closeTestApp, TestContext } from '../utils/test-app';
import { TestClient } from '../utils/test-client';
import { createTenantAuth, createAdminAuth } from '../utils/test-auth';
import { createFactories, TestFactories } from '../factories';
import { resetDatabase } from '../setup';

describe('Auth (e2e)', () => {
  let ctx: TestContext;
  let client: TestClient;
  let factories: TestFactories;

  beforeAll(async () => {
    ctx = await createTestApp();
    client = new TestClient(ctx.app);
    factories = createFactories(ctx.prisma);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  describe('POST /api/auth/request-link', () => {
    it('should return success message for registered tenant', async () => {
      // Arrange
      const unit = await factories.unit.create();
      const room = await factories.room.create({ unitId: unit.id });
      await factories.tenant.createWithRoom(room.id, {
        email: 'test@example.com',
      });

      // Act
      const response = await client
        .post('/auth/request-link', { email: 'test@example.com' })
        .expect(201);

      // Assert
      expect(response.body.message).toContain('If this email is registered');

      // Verify magic link was created in database
      const magicLink = await ctx.prisma.magicLink.findFirst({
        where: { tenant: { email: 'test@example.com' } },
      });
      expect(magicLink).toBeTruthy();
      expect(magicLink?.isUsed).toBe(false);
    });

    it('should return same message for non-existent email (security)', async () => {
      const response = await client
        .post('/auth/request-link', { email: 'nonexistent@example.com' })
        .expect(201);

      expect(response.body.message).toContain('If this email is registered');
    });

    it('should normalize email to lowercase', async () => {
      const unit = await factories.unit.create();
      const room = await factories.room.create({ unitId: unit.id });
      await factories.tenant.createWithRoom(room.id, {
        email: 'test@example.com',
      });

      await client
        .post('/auth/request-link', { email: 'TEST@EXAMPLE.COM' })
        .expect(201);

      const magicLink = await ctx.prisma.magicLink.findFirst({
        where: { tenant: { email: 'test@example.com' } },
      });
      expect(magicLink).toBeTruthy();
    });

    it('should reject invalid email format', async () => {
      await client
        .post('/auth/request-link', { email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should return JWT for valid magic link', async () => {
      // Arrange: Create tenant and magic link
      const unit = await factories.unit.create();
      const room = await factories.room.create({ unitId: unit.id });
      const tenant = await factories.tenant.createWithRoom(room.id, {
        email: 'test@example.com',
      });

      // Request magic link first
      await client
        .post('/auth/request-link', { email: 'test@example.com' })
        .expect(201);

      // Get the token from database
      const magicLink = await ctx.prisma.magicLink.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
      });

      // Act
      const response = await client
        .post('/auth/verify', { token: magicLink!.token })
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).toHaveProperty('isAdmin', false);
    });

    it('should reject invalid token', async () => {
      await client
        .post('/auth/verify', { token: 'invalid-token' })
        .expect(401);
    });

    it('should reject already used token', async () => {
      // Arrange
      const unit = await factories.unit.create();
      const room = await factories.room.create({ unitId: unit.id });
      const tenant = await factories.tenant.createWithRoom(room.id, {
        email: 'test@example.com',
      });

      await client.post('/auth/request-link', { email: 'test@example.com' });

      const magicLink = await ctx.prisma.magicLink.findFirst({
        where: { tenantId: tenant.id },
      });

      // Use it once
      await client.post('/auth/verify', { token: magicLink!.token }).expect(201);

      // Try to use it again
      await client.post('/auth/verify', { token: magicLink!.token }).expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return tenant info for authenticated tenant', async () => {
      // Arrange
      const unit = await factories.unit.create();
      const room = await factories.room.create({ unitId: unit.id });
      const tenant = await factories.tenant.createWithRoom(room.id);
      const auth = createTenantAuth(ctx.jwtService, tenant.id, tenant.email);

      // Act
      const response = await client.withAuth(auth).get('/auth/me').expect(200);

      // Assert
      expect(response.body.id).toBe(tenant.id);
      expect(response.body.email).toBe(tenant.email);
      expect(response.body.isAdmin).toBe(false);
    });

    it('should return admin info for authenticated admin', async () => {
      // Arrange
      const admin = await factories.admin.createSuperAdmin({
        email: 'admin@example.com',
        name: 'Test Admin',
      });
      const auth = createAdminAuth(ctx.jwtService, admin.id, 'SUPER_ADMIN', []);

      // Act
      const response = await client.withAuth(auth).get('/auth/me').expect(200);

      // Assert
      expect(response.body.id).toBe(admin.id);
      expect(response.body.email).toBe('admin@example.com');
      expect(response.body.isAdmin).toBe(true);
      expect(response.body.role).toBe('SUPER_ADMIN');
    });

    it('should reject unauthenticated requests', async () => {
      await client.get('/auth/me').expect(401);
    });
  });
});
