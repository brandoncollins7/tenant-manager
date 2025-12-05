export type AdminRole = 'SUPER_ADMIN' | 'PROPERTY_MANAGER';

export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  name?: string;
  occupants?: Occupant[];
  room?: Room;
  role?: AdminRole;
  unitAssignments?: { id: string; unitId: string; unit: Unit }[];
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  createdAt: string;
  unitAssignments?: {
    id: string;
    unitId: string;
    unit: Unit;
  }[];
}

export interface Occupant {
  id: string;
  name: string;
  choreDay: number;
  isActive: boolean;
}

export interface Room {
  id: string;
  roomNumber: string;
  unit: Unit;
}

export interface Unit {
  id: string;
  name: string;
  timezone: string;
}

export interface LeaseDocument {
  id: string;
  tenantId: string;
  version: number;
  filename: string;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
  isCurrent: boolean;
}

export interface Tenant {
  id: string;
  email: string;
  phone?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  occupants: Occupant[];
  room: Room;
  leaseDocument?: string;
  leaseDocuments?: LeaseDocument[];
}

export interface ChoreDefinition {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
}

export interface ChoreCompletion {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'MISSED' | 'EXCUSED';
  completedAt?: string;
  photoPath?: string;
  notes?: string;
  chore: ChoreDefinition;
  occupant: Occupant;
}

export interface ChoreSchedule {
  id: string;
  weekId: string;
  weekStart: string;
  completions: ChoreCompletion[];
}

export interface SwapRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  reason?: string;
  createdAt: string;
  requester: Occupant;
  target: Occupant;
  schedule: ChoreSchedule;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Request {
  id: string;
  type: 'CLEANING_SUPPLIES' | 'MAINTENANCE_ISSUE';
  description: string;
  photoPath?: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
  tenant?: Tenant;
  unit?: Unit;
}

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  CLEANING_SUPPLIES: 'Cleaning Supplies',
  MAINTENANCE_ISSUE: 'Maintenance Issue',
};

export type ConcernType = 'NOISE' | 'CLEANLINESS' | 'HARASSMENT' | 'PROPERTY_DAMAGE' | 'OTHER';
export type ConcernSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type ConcernStatus = 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface Concern {
  id: string;
  type: ConcernType;
  severity: ConcernSeverity;
  description: string;
  photoPath?: string;
  status: ConcernStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
  reporter?: Tenant;
  reported?: Tenant;
  unit?: Unit;
}

export const CONCERN_TYPE_LABELS: Record<ConcernType, string> = {
  NOISE: 'Noise',
  CLEANLINESS: 'Cleanliness',
  HARASSMENT: 'Harassment',
  PROPERTY_DAMAGE: 'Property Damage',
  OTHER: 'Other',
};

export const CONCERN_SEVERITY_LABELS: Record<ConcernSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export const CONCERN_STATUS_LABELS: Record<ConcernStatus, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

export interface OccupantStats {
  total: number;
  completed: number;
  missed: number;
  pending: number;
  completionRate: number;
}

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// Combined request/concern types
export type RequestCategory = 'REQUEST' | 'CONCERN';
export type RequestType = 'CLEANING_SUPPLIES' | 'MAINTENANCE_ISSUE';

export interface CombinedRequestItem {
  id: string;
  category: RequestCategory;
  type: RequestType | ConcernType;
  description: string;
  photoPath?: string;
  status: string;
  severity?: ConcernSeverity;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
  reportedRoom?: string;
  reporterRoom?: string;
  tenant?: {
    id: string;
    email: string;
    phone?: string;
    room?: {
      id: string;
      roomNumber: string;
    };
  };
  unitId?: string;
}

export const REQUEST_CATEGORY_LABELS: Record<RequestCategory, string> = {
  REQUEST: 'General Request',
  CONCERN: 'Tenant Concern',
};

export interface CombinedStats {
  requests: {
    pending: number;
    resolved: number;
  };
  concerns: {
    pending: number;
    underReview: number;
    resolved: number;
    dismissed: number;
    active: number;
  };
  totalActive: number;
}

export interface ReportableTenant {
  id: string;
  roomNumber: string;
}
