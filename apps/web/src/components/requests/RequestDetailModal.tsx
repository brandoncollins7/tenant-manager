import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { AuthenticatedImage } from '../ui/AuthenticatedImage';
import { Clock, CheckCircle, Camera } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { REQUEST_TYPE_LABELS } from '../../types';
import type { Request } from '../../types';

interface RequestDetailModalProps {
  request: Request | null;
  onClose: () => void;
}

export function RequestDetailModal({
  request,
  onClose,
}: RequestDetailModalProps) {
  if (!request) return null;

  const getTypeIcon = (type: string) => {
    return type === 'CLEANING_SUPPLIES' ? '🧹' : '🔧';
  };

  return (
    <Modal isOpen={!!request} onClose={onClose} title="Request Details">
      <div className="space-y-6">
        {/* Type and Status */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getTypeIcon(request.type)}</span>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {REQUEST_TYPE_LABELS[request.type]}
            </h3>
            <div className="mt-1">
              {request.status === 'PENDING' ? (
                <Badge variant="warning">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending
                </Badge>
              ) : (
                <Badge variant="success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Resolved
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Description
          </h4>
          <p className="text-gray-900 whitespace-pre-wrap">
            {request.description}
          </p>
        </div>

        {/* Photo */}
        {request.photoPath && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Photo
            </h4>
            <AuthenticatedImage
              src={`/uploads/${request.photoPath}`}
              alt="Request photo"
              className="w-full rounded-lg"
            />
          </div>
        )}

        {/* Timeline */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Timeline</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-primary-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Submitted</p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(request.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>

            {request.status === 'RESOLVED' && request.resolvedAt && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Resolved</p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(request.resolvedAt), {
                      addSuffix: true,
                    })}
                  </p>
                  {request.resolvedBy && (
                    <p className="text-xs text-gray-500 mt-1">
                      By: {request.resolvedBy}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resolution Notes */}
        {request.status === 'RESOLVED' && request.notes && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-900 mb-2">
              Resolution Notes
            </h4>
            <p className="text-sm text-green-800 whitespace-pre-wrap">
              {request.notes}
            </p>
          </div>
        )}

        {request.status === 'PENDING' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Your request has been received and will be addressed soon.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
