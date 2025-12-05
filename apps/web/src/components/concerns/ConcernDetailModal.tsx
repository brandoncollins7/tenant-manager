import { format } from 'date-fns';
import { Clock, CheckCircle, Eye, XCircle, Camera } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import {
  CONCERN_TYPE_LABELS,
  CONCERN_SEVERITY_LABELS,
  ConcernStatus,
} from '../../types';
import type { Concern } from '../../types';

interface ConcernDetailModalProps {
  concern: Concern | null;
  onClose: () => void;
}

const STATUS_CONFIG: Record<
  ConcernStatus,
  { variant: 'warning' | 'info' | 'success' | 'default'; icon: any; label: string }
> = {
  PENDING: { variant: 'warning', icon: Clock, label: 'Pending' },
  UNDER_REVIEW: { variant: 'info', icon: Eye, label: 'Under Review' },
  RESOLVED: { variant: 'success', icon: CheckCircle, label: 'Resolved' },
  DISMISSED: { variant: 'default', icon: XCircle, label: 'Dismissed' },
};

const CONCERN_TYPE_ICONS: Record<string, string> = {
  NOISE: '🔊',
  CLEANLINESS: '🧹',
  HARASSMENT: '⚠️',
  PROPERTY_DAMAGE: '🔨',
  OTHER: '📋',
};

export function ConcernDetailModal({
  concern,
  onClose,
}: ConcernDetailModalProps) {
  if (!concern) return null;

  const statusConfig = STATUS_CONFIG[concern.status];
  const StatusIcon = statusConfig.icon;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'text-red-600 bg-red-100';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100';
      case 'LOW':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Modal isOpen={!!concern} onClose={onClose} title="Concern Details">
      <div className="space-y-4">
        {/* Header with type and status */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{CONCERN_TYPE_ICONS[concern.type]}</span>
            <span className="font-semibold text-lg">
              {CONCERN_TYPE_LABELS[concern.type]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig.variant}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${getSeverityColor(concern.severity)}`}
            >
              {CONCERN_SEVERITY_LABELS[concern.severity]} Priority
            </span>
          </div>
        </div>

        {/* About */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">
            <span className="font-medium">About:</span> Room{' '}
            {concern.reported?.room?.roomNumber || 'Unknown'}
          </p>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">
            Description
          </h4>
          <p className="text-gray-900 whitespace-pre-wrap">
            {concern.description}
          </p>
        </div>

        {/* Photo */}
        {concern.photoPath && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Camera className="w-4 h-4" />
              Evidence Photo
            </h4>
            <img
              src={`/api/uploads/${concern.photoPath}`}
              alt="Evidence"
              className="w-full rounded-lg"
            />
          </div>
        )}

        {/* Resolution notes */}
        {concern.notes && (
          <div className="bg-blue-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-800 mb-1">
              Resolution Notes
            </h4>
            <p className="text-sm text-blue-700">{concern.notes}</p>
          </div>
        )}

        {/* Timeline */}
        <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">Submitted:</span>{' '}
            {format(new Date(concern.createdAt), 'PPp')}
          </p>
          {concern.resolvedAt && (
            <p>
              <span className="font-medium">Closed:</span>{' '}
              {format(new Date(concern.resolvedAt), 'PPp')}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
