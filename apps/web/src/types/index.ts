export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  name?: string;
  occupants?: Occupant[];
  room?: Room;
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

export interface Tenant {
  id: string;
  email: string;
  phone?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  occupants: Occupant[];
  room: Room;
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
