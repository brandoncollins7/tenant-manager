/**
 * Centralized query keys and invalidation helpers.
 * This ensures consistent cache invalidation across the app.
 */

import type { QueryClient } from '@tanstack/react-query';

// Query key factories for type-safe, consistent keys
export const queryKeys = {
  // Chores
  chores: {
    all: ['chores'] as const,
    today: ['todaysChores'] as const,
    schedule: (weekId?: string, unitId?: string) => ['schedule', weekId, unitId] as const,
    history: ['choreHistory'] as const,
  },

  // Tenants
  tenants: {
    all: ['tenants'] as const,
    admin: ['admin', 'tenants'] as const,
    byUnit: (unitId: string) => ['unit', unitId, 'tenants'] as const,
    leaseHistory: (tenantId: string) => ['lease-history', tenantId] as const,
  },

  // Rooms
  rooms: {
    all: ['rooms'] as const,
    detail: (roomId: string) => ['room', roomId] as const,
  },

  // Units
  units: {
    all: ['units'] as const,
    detail: (unitId: string) => ['unit', unitId] as const,
    availableRooms: (unitId: string) => ['unit', unitId, 'available-rooms'] as const,
  },

  // Occupants
  occupants: {
    byTenant: (tenantId: string) => ['occupants', tenantId] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
};

/**
 * Invalidation groups - when one thing changes, what else needs to refresh?
 */
export function invalidateChoreQueries(queryClient: QueryClient) {
  // Invalidate all chore-related queries
  queryClient.invalidateQueries({ queryKey: queryKeys.chores.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.chores.today });
  queryClient.invalidateQueries({ queryKey: queryKeys.chores.history });
  // Invalidate all schedule queries (any weekId/unitId combination)
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[0] === 'schedule',
  });
}

export function invalidateTenantQueries(queryClient: QueryClient, tenantId?: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.tenants.admin });

  // Invalidate all unit tenant queries
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === 'unit' &&
      query.queryKey[2] === 'tenants',
  });

  // Invalidate all room queries (tenant info is embedded in room data)
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[0] === 'room',
  });

  if (tenantId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.tenants.leaseHistory(tenantId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.occupants.byTenant(tenantId) });
  }
}

export function invalidateRoomQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[0] === 'room',
  });
}

export function invalidateUnitQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.units.all });
  queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[0] === 'unit',
  });
}

export function invalidateOccupantQueries(queryClient: QueryClient, tenantId?: string) {
  if (tenantId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.occupants.byTenant(tenantId) });
  }
  // Also invalidate tenant queries since occupant counts may change
  invalidateTenantQueries(queryClient);
  // And room queries since occupant info is shown there
  invalidateRoomQueries(queryClient);
}
