import { createTestApp, closeTestApp, TestContext } from '../utils/test-app';
import { TestClient } from '../utils/test-client';
import { createSuperAdminAuth } from '../utils/test-auth';
import { createFactories, TestFactories } from '../factories';
import { resetDatabase } from '../setup';

describe('Rooms & Tenants (e2e)', () => {
  let ctx: TestContext;
  let client: TestClient;
  let factories: TestFactories;
  let adminClient: TestClient;

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

    // Create a super admin for authenticated requests
    const admin = await factories.admin.createSuperAdmin({
      email: 'admin@example.com',
      name: 'Test Admin',
    });
    const auth = createSuperAdminAuth(ctx.jwtService, admin.id);
    adminClient = client.withAuth(auth);
  });

  describe('Unit and Room Management', () => {
    it('should create a unit', async () => {
      const response = await adminClient
        .post('/units', {
          name: 'Test Building',
        })
        .expect(201);

      expect(response.body.name).toBe('Test Building');
      expect(response.body.id).toBeDefined();
    });

    it('should create rooms in a unit', async () => {
      // Create unit first
      const unitResponse = await adminClient
        .post('/units', { name: 'Test Building' })
        .expect(201);

      const unitId = unitResponse.body.id;

      // Create rooms
      const room1 = await adminClient
        .post('/rooms', { unitId, roomNumber: 'A' })
        .expect(201);

      const room2 = await adminClient
        .post('/rooms', { unitId, roomNumber: 'B' })
        .expect(201);

      expect(room1.body.roomNumber).toBe('A');
      expect(room1.body.unitId).toBe(unitId);
      expect(room2.body.roomNumber).toBe('B');

      // Verify rooms are listed
      const roomsResponse = await adminClient
        .get(`/rooms?unitId=${unitId}`)
        .expect(200);

      expect(roomsResponse.body).toHaveLength(2);
    });
  });

  describe('Tenant Assignment Flow', () => {
    let unitId: string;
    let roomId: string;

    beforeEach(async () => {
      // Create unit and room for tenant tests
      const unitResponse = await adminClient
        .post('/units', { name: 'Test Building' })
        .expect(201);
      unitId = unitResponse.body.id;

      const roomResponse = await adminClient
        .post('/rooms', { unitId, roomNumber: 'A' })
        .expect(201);
      roomId = roomResponse.body.id;
    });

    it('should create a tenant and assign to room', async () => {
      // Create tenant with room assignment
      const tenantResponse = await adminClient
        .post('/tenants', {
          email: 'tenant@example.com',
          phone: '555-1234',
          roomId,
          primaryOccupantName: 'John Doe',
          choreDay: 1,
          startDate: new Date().toISOString(),
        })
        .expect(201);

      expect(tenantResponse.body.email).toBe('tenant@example.com');
      expect(tenantResponse.body.roomId).toBe(roomId);
      expect(tenantResponse.body.occupants).toHaveLength(1);
      expect(tenantResponse.body.occupants[0].name).toBe('John Doe');

      // Verify room shows tenant
      const roomResponse = await adminClient.get(`/rooms/${roomId}`).expect(200);
      expect(roomResponse.body.tenant).toBeTruthy();
      expect(roomResponse.body.tenant.email).toBe('tenant@example.com');
    });

    it('should remove tenant from room without deleting them', async () => {
      // Create tenant
      const tenantResponse = await adminClient
        .post('/tenants', {
          email: 'tenant@example.com',
          roomId,
          primaryOccupantName: 'John Doe',
          choreDay: 1,
          startDate: new Date().toISOString(),
        })
        .expect(201);

      const tenantId = tenantResponse.body.id;

      // Remove tenant from room (set roomId to null)
      await adminClient
        .patch(`/tenants/${tenantId}`, { roomId: null })
        .expect(200);

      // Verify room no longer has tenant
      const roomResponse = await adminClient.get(`/rooms/${roomId}`).expect(200);
      expect(roomResponse.body.tenant).toBeNull();

      // Verify tenant still exists and is active
      const tenantCheck = await adminClient
        .get(`/tenants/${tenantId}`)
        .expect(200);
      expect(tenantCheck.body.isActive).toBe(true);
      expect(tenantCheck.body.roomId).toBeNull();

      // Verify tenant appears in unassigned list
      const unassignedResponse = await adminClient
        .get('/tenants/unassigned')
        .expect(200);
      expect(unassignedResponse.body).toHaveLength(1);
      expect(unassignedResponse.body[0].id).toBe(tenantId);
    });

    it('should reassign tenant to room after removal', async () => {
      // Create tenant
      const tenantResponse = await adminClient
        .post('/tenants', {
          email: 'tenant@example.com',
          roomId,
          primaryOccupantName: 'John Doe',
          choreDay: 1,
          startDate: new Date().toISOString(),
        })
        .expect(201);

      const tenantId = tenantResponse.body.id;

      // Remove tenant from room
      await adminClient
        .patch(`/tenants/${tenantId}`, { roomId: null })
        .expect(200);

      // Reassign tenant to room
      await adminClient
        .patch(`/tenants/${tenantId}`, { roomId })
        .expect(200);

      // Verify room has tenant again
      const roomResponse = await adminClient.get(`/rooms/${roomId}`).expect(200);
      expect(roomResponse.body.tenant).toBeTruthy();
      expect(roomResponse.body.tenant.id).toBe(tenantId);
    });

    it('should soft delete tenant and free up room', async () => {
      // Create tenant
      const tenantResponse = await adminClient
        .post('/tenants', {
          email: 'tenant@example.com',
          roomId,
          primaryOccupantName: 'John Doe',
          choreDay: 1,
          startDate: new Date().toISOString(),
        })
        .expect(201);

      const tenantId = tenantResponse.body.id;

      // Delete tenant (soft delete)
      await adminClient.delete(`/tenants/${tenantId}`).expect(200);

      // Verify room no longer has tenant
      const roomResponse = await adminClient.get(`/rooms/${roomId}`).expect(200);
      expect(roomResponse.body.tenant).toBeNull();

      // Verify tenant is no longer in unassigned list (because isActive=false)
      const unassignedResponse = await adminClient
        .get('/tenants/unassigned')
        .expect(200);
      expect(unassignedResponse.body).toHaveLength(0);
    });

    it('should create new tenant in room after previous tenant removed', async () => {
      // Create first tenant
      const tenant1Response = await adminClient
        .post('/tenants', {
          email: 'tenant1@example.com',
          roomId,
          primaryOccupantName: 'John Doe',
          choreDay: 1,
          startDate: new Date().toISOString(),
        })
        .expect(201);

      // Remove first tenant from room (not delete)
      await adminClient
        .patch(`/tenants/${tenant1Response.body.id}`, { roomId: null })
        .expect(200);

      // Create second tenant in same room
      const tenant2Response = await adminClient
        .post('/tenants', {
          email: 'tenant2@example.com',
          roomId,
          primaryOccupantName: 'Jane Doe',
          choreDay: 2,
          startDate: new Date().toISOString(),
        })
        .expect(201);

      expect(tenant2Response.body.roomId).toBe(roomId);

      // Verify room shows new tenant
      const roomResponse = await adminClient.get(`/rooms/${roomId}`).expect(200);
      expect(roomResponse.body.tenant.email).toBe('tenant2@example.com');

      // Verify both tenants exist
      const allTenants = await adminClient.get('/tenants').expect(200);
      expect(allTenants.body).toHaveLength(2);
    });

    it('should create new tenant in room after previous tenant soft deleted', async () => {
      // Create first tenant
      const tenant1Response = await adminClient
        .post('/tenants', {
          email: 'tenant1@example.com',
          roomId,
          primaryOccupantName: 'John Doe',
          choreDay: 1,
          startDate: new Date().toISOString(),
        })
        .expect(201);

      // Soft delete first tenant
      await adminClient.delete(`/tenants/${tenant1Response.body.id}`).expect(200);

      // Create second tenant in same room (should work since room is now free)
      const tenant2Response = await adminClient
        .post('/tenants', {
          email: 'tenant2@example.com',
          roomId,
          primaryOccupantName: 'Jane Doe',
          choreDay: 2,
          startDate: new Date().toISOString(),
        })
        .expect(201);

      expect(tenant2Response.body.roomId).toBe(roomId);

      // Verify room shows new tenant
      const roomResponse = await adminClient.get(`/rooms/${roomId}`).expect(200);
      expect(roomResponse.body.tenant.email).toBe('tenant2@example.com');
    });

    it('should not show soft-deleted tenant in room details', async () => {
      // Create tenant
      const tenantResponse = await adminClient
        .post('/tenants', {
          email: 'tenant@example.com',
          roomId,
          primaryOccupantName: 'John Doe',
          choreDay: 1,
          startDate: new Date().toISOString(),
        })
        .expect(201);

      // Delete tenant
      await adminClient.delete(`/tenants/${tenantResponse.body.id}`).expect(200);

      // Verify room doesn't show deleted tenant
      const roomResponse = await adminClient.get(`/rooms/${roomId}`).expect(200);
      expect(roomResponse.body.tenant).toBeNull();
    });
  });

  describe('Multiple Rooms and Tenants', () => {
    it('should manage multiple tenants across multiple rooms', async () => {
      // Create unit
      const unitResponse = await adminClient
        .post('/units', { name: 'Large Building' })
        .expect(201);
      const unitId = unitResponse.body.id;

      // Create 3 rooms
      const room1 = await adminClient
        .post('/rooms', { unitId, roomNumber: '101' })
        .expect(201);
      const room2 = await adminClient
        .post('/rooms', { unitId, roomNumber: '102' })
        .expect(201);
      const room3 = await adminClient
        .post('/rooms', { unitId, roomNumber: '103' })
        .expect(201);

      // Create tenants for rooms 1 and 2
      const tenant1 = await adminClient
        .post('/tenants', {
          email: 'tenant1@example.com',
          roomId: room1.body.id,
          primaryOccupantName: 'Tenant 1',
          choreDay: 0,
          startDate: new Date().toISOString(),
        })
        .expect(201);

      const tenant2 = await adminClient
        .post('/tenants', {
          email: 'tenant2@example.com',
          roomId: room2.body.id,
          primaryOccupantName: 'Tenant 2',
          choreDay: 1,
          startDate: new Date().toISOString(),
        })
        .expect(201);

      // Verify 2 tenants assigned
      const allTenants = await adminClient.get('/tenants').expect(200);
      expect(allTenants.body).toHaveLength(2);

      // Remove tenant 2 from room
      await adminClient
        .patch(`/tenants/${tenant2.body.id}`, { roomId: null })
        .expect(200);

      // Verify one unassigned
      const unassigned = await adminClient.get('/tenants/unassigned').expect(200);
      expect(unassigned.body).toHaveLength(1);
      expect(unassigned.body[0].email).toBe('tenant2@example.com');

      // Reassign tenant 2 to room 3
      await adminClient
        .patch(`/tenants/${tenant2.body.id}`, { roomId: room3.body.id })
        .expect(200);

      // Verify room 2 is empty, room 3 has tenant 2
      const room2Response = await adminClient
        .get(`/rooms/${room2.body.id}`)
        .expect(200);
      expect(room2Response.body.tenant).toBeNull();

      const room3Response = await adminClient
        .get(`/rooms/${room3.body.id}`)
        .expect(200);
      expect(room3Response.body.tenant.email).toBe('tenant2@example.com');

      // Verify no unassigned tenants
      const unassignedAfter = await adminClient
        .get('/tenants/unassigned')
        .expect(200);
      expect(unassignedAfter.body).toHaveLength(0);
    });
  });
});
