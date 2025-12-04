import {
  Mail,
  Phone,
  Calendar,
  Trash2,
  Pencil,
  Upload,
  History,
  FileText,
  Plus,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { DAYS_OF_WEEK } from '../../types';

interface Occupant {
  id: string;
  name: string;
  choreDay: number;
  isActive: boolean;
}

interface TenantInfoCardProps {
  tenant: {
    id: string;
    email: string;
    phone?: string;
    startDate: string;
    isActive: boolean;
    leaseDocument?: string;
  };
  occupants: Occupant[];
  roomNumber?: string;
  // Action callbacks
  onImpersonate?: () => void;
  onResendLoginEmail: () => void;
  onDeleteTenant?: () => void;
  onRemoveFromRoom?: () => void;
  onEditTenant: () => void;
  onUploadLease: () => void;
  onViewLeaseHistory: () => void;
  onViewCurrentLease: () => void;
  // Occupant callbacks
  onAddOccupant: () => void;
  onEditOccupant: (occupant: Occupant) => void;
  onDeleteOccupant: (occupant: Occupant) => void;
  // State flags
  isSuperAdmin?: boolean;
  isPendingImpersonate?: boolean;
  isPendingResendEmail?: boolean;
  isPendingRemove?: boolean;
}

export function TenantInfoCard({
  tenant,
  occupants,
  roomNumber,
  onImpersonate,
  onResendLoginEmail,
  onDeleteTenant,
  onRemoveFromRoom,
  onEditTenant,
  onUploadLease,
  onViewLeaseHistory,
  onViewCurrentLease,
  onAddOccupant,
  onEditOccupant,
  onDeleteOccupant,
  isSuperAdmin = false,
  isPendingImpersonate = false,
  isPendingResendEmail = false,
  isPendingRemove = false,
}: TenantInfoCardProps) {
  const activeOccupants = occupants.filter((occ) => occ.isActive);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {roomNumber ? `Room ${roomNumber}` : 'Tenant Information'}
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                tenant.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {tenant.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && onImpersonate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onImpersonate}
              disabled={isPendingImpersonate}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {isPendingImpersonate ? 'Loading...' : 'Impersonate'}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={onResendLoginEmail}
            disabled={isPendingResendEmail}
          >
            <Mail className="w-4 h-4 mr-2" />
            {isPendingResendEmail ? 'Sending...' : 'Resend Login Email'}
          </Button>
          {onRemoveFromRoom && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRemoveFromRoom}
              disabled={isPendingRemove}
            >
              <UserMinus className="w-4 h-4 mr-2" />
              {isPendingRemove ? 'Removing...' : 'Remove from Room'}
            </Button>
          )}
          {onDeleteTenant && (
            <Button
              variant="danger"
              size="sm"
              onClick={onDeleteTenant}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Tenant
            </Button>
          )}
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Email with Edit */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <button
              onClick={onEditTenant}
              className="p-1 text-gray-400 hover:text-primary-600 rounded transition-colors"
              title="Edit tenant"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-gray-900">{tenant.email}</p>
        </div>

        {/* Contact Info Row */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 border-t border-gray-200 pt-4">
          <span className="flex items-center gap-1">
            <Mail className="w-4 h-4" />
            {tenant.email}
          </span>
          {tenant.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              {tenant.phone}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Since {new Date(tenant.startDate).toLocaleDateString()}
          </span>
        </div>

        {/* Lease Actions Row */}
        <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
          <button
            onClick={onUploadLease}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            title="Upload new lease version"
          >
            <Upload className="w-4 h-4" />
            Upload Lease
          </button>

          {tenant.leaseDocument && (
            <>
              <span className="text-gray-300">|</span>
              <button
                onClick={onViewLeaseHistory}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                title="View lease history"
              >
                <History className="w-4 h-4" />
                History
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={onViewCurrentLease}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                title="View current lease"
              >
                <FileText className="w-4 h-4" />
                View Current
              </button>
            </>
          )}
        </div>

        {/* Occupants Section */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">
              Occupants ({activeOccupants.length})
            </h4>
            <Button size="sm" onClick={onAddOccupant}>
              <Plus className="w-4 h-4 mr-2" />
              Add Occupant
            </Button>
          </div>

          {activeOccupants.length > 0 ? (
            <div className="space-y-2">
              {activeOccupants.map((occupant) => (
                <div
                  key={occupant.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{occupant.name}</div>
                    <div className="text-sm text-gray-600">
                      {DAYS_OF_WEEK[occupant.choreDay]}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditOccupant(occupant)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit occupant"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteOccupant(occupant)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove occupant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No occupants yet. Add an occupant to get started.</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
