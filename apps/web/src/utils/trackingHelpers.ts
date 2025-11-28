// Normalize route paths for consistent tracking
// Examples: /admin/rooms/abc-123 → admin_rooms_id, / → dashboard
export function normalizeRouteName(path: string | null): string {
  if (!path || path === '/') return 'dashboard';

  const segments = path.split('/').filter(Boolean);

  return segments
    .map(seg => /^[a-f0-9-]{36}$/i.test(seg) ? 'id' : seg)
    .join('_');
}

// Extract route parameters from path
// Example: /admin/rooms/abc-123 → { rooms_id: 'abc-123' }
export function extractRouteParams(path: string): Record<string, any> {
  const params: Record<string, any> = {};
  const segments = path.split('/').filter(Boolean);

  segments.forEach((seg, i) => {
    if (/^[a-f0-9-]{36}$/i.test(seg)) {
      const prevSegment = segments[i - 1];
      if (prevSegment) {
        params[`${prevSegment}_id`] = seg;
      }
    }
  });

  return params;
}

// Derive modal ID from title for automatic tracking
// Example: "New Request" → "new_request"
export function deriveModalId(title?: string): string {
  return title
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'unnamed_modal';
}

// Sanitize mutation variables (remove sensitive data)
export function sanitizeMutationVariables(variables: any): Record<string, any> {
  if (!variables || typeof variables !== 'object') return {};

  const sanitized = { ...variables };

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
  sensitiveFields.forEach(field => delete sanitized[field]);

  // Only include primitive values
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      delete sanitized[key];
    }
  });

  return sanitized;
}

// Get current user role from JWT token
export function getCurrentUserRole(): string {
  const token = localStorage.getItem('token');
  if (!token) return 'unauthenticated';

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.isAdmin ? 'admin' : 'tenant';
  } catch {
    return 'unknown';
  }
}
