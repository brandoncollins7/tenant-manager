import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AuthenticatedImage } from '../ui/AuthenticatedImage';
import { concernsApi } from '../../api/concerns';
import {
  CONCERN_TYPE_LABELS,
  CONCERN_SEVERITY_LABELS,
  CONCERN_STATUS_LABELS,
  ConcernStatus,
} from '../../types';
import { extractErrorMessage } from '../../utils/errors';
import type { Concern } from '../../types';

interface UpdateConcernModalProps {
  concern: Concern | null;
  adminEmail: string;
  onClose: () => void;
}

const CONCERN_TYPE_ICONS: Record<string, string> = {
  NOISE: '🔊',
  CLEANLINESS: '🧹',
  HARASSMENT: '⚠️',
  PROPERTY_DAMAGE: '🔨',
  OTHER: '📋',
};

export function UpdateConcernModal({
  concern,
  adminEmail,
  onClose,
}: UpdateConcernModalProps) {
  const [status, setStatus] = useState<ConcernStatus | ''>('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: string;
      status?: ConcernStatus;
      notes?: string;
    }) => concernsApi.update(id, adminEmail, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'concerns'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['concerns'] });
      toast.success('Concern updated');
      handleClose();
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const handleSubmit = () => {
    if (!concern) return;
    updateMutation.mutate({
      id: concern.id,
      status: status || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const handleClose = () => {
    setStatus('');
    setNotes('');
    onClose();
  };

  if (!concern) return null;

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

  const isActive =
    concern.status === 'PENDING' || concern.status === 'UNDER_REVIEW';

  return (
    <Modal isOpen={!!concern} onClose={handleClose} title="Update Concern">
      <div className="space-y-6">
        {/* Concern Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">{CONCERN_TYPE_ICONS[concern.type]}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900">
                  {CONCERN_TYPE_LABELS[concern.type]}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSeverityColor(concern.severity)}`}
                >
                  {CONCERN_SEVERITY_LABELS[concern.severity]} Priority
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                <strong>Reporter:</strong> Room{' '}
                {concern.reporter?.room?.roomNumber || '?'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>About:</strong> Room{' '}
                {concern.reported?.room?.roomNumber || '?'}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {concern.description}
          </p>
          {concern.photoPath && (
            <div className="mt-3">
              <AuthenticatedImage
                src={`/uploads/${concern.photoPath}`}
                alt="Evidence photo"
                className="w-full rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Current Status */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Current Status:</strong>{' '}
            {CONCERN_STATUS_LABELS[concern.status]}
          </p>
          {concern.notes && (
            <p className="text-sm text-blue-700 mt-1">
              <strong>Existing Notes:</strong> {concern.notes}
            </p>
          )}
        </div>

        {/* Privacy Reminder */}
        <div className="bg-amber-50 border-l-4 border-amber-400 p-3">
          <p className="text-sm text-amber-800">
            <strong>Privacy Note:</strong> The tenant being reported has not been
            notified and will not see this concern or any updates.
          </p>
        </div>

        {/* Status Update */}
        {isActive && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('UNDER_REVIEW')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  status === 'UNDER_REVIEW'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900">Under Review</p>
                <p className="text-xs text-gray-600">Being investigated</p>
              </button>
              <button
                type="button"
                onClick={() => setStatus('RESOLVED')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  status === 'RESOLVED'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900">Resolved</p>
                <p className="text-xs text-gray-600">Issue addressed</p>
              </button>
              <button
                type="button"
                onClick={() => setStatus('DISMISSED')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  status === 'DISMISSED'
                    ? 'border-gray-600 bg-gray-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900">Dismissed</p>
                <p className="text-xs text-gray-600">Not actionable</p>
              </button>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Admin Notes {isActive ? '(Optional)' : ''}
          </label>
          <textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record any actions taken or observations..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Notes are for admin records only. The reporter will see resolution
            notes if provided.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleClose}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={updateMutation.isPending || (!status && !notes.trim())}
            isLoading={updateMutation.isPending}
          >
            {status ? 'Update Status' : 'Save Notes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
