import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { requestsApi } from '../../api/requests';
import { REQUEST_TYPE_LABELS } from '../../types';
import { extractErrorMessage } from '../../utils/errors';
import type { Request } from '../../types';

interface ResolveRequestModalProps {
  request: Request | null;
  adminEmail: string;
  onClose: () => void;
}

export function ResolveRequestModal({
  request,
  adminEmail,
  onClose,
}: ResolveRequestModalProps) {
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      requestsApi.resolve(id, adminEmail, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'requests'] });
      toast.success('Request marked as resolved');
      handleClose();
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const handleSubmit = () => {
    if (!request) return;
    resolveMutation.mutate({
      id: request.id,
      notes: notes.trim() || undefined,
    });
  };

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  if (!request) return null;

  const getTypeIcon = (type: string) => {
    return type === 'CLEANING_SUPPLIES' ? '🧹' : '🔧';
  };

  return (
    <Modal isOpen={!!request} onClose={handleClose} title="Resolve Request">
      <div className="space-y-6">
        {/* Request Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">{getTypeIcon(request.type)}</span>
            <div>
              <h3 className="font-semibold text-gray-900">
                {REQUEST_TYPE_LABELS[request.type]}
              </h3>
              {request.tenant && (
                <p className="text-sm text-gray-600">
                  Room {request.tenant.room?.roomNumber} • {request.tenant.email}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {request.description}
          </p>
          {request.photoPath && (
            <div className="mt-3">
              <img
                src={`/api/uploads/photos/${request.photoPath}`}
                alt="Request photo"
                className="w-full rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Resolution Notes */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Resolution Notes (Optional)
          </label>
          <textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How was this resolved? What action was taken?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            These notes will be visible to the tenant.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleClose}
            disabled={resolveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            isLoading={resolveMutation.isPending}
          >
            Mark as Resolved
          </Button>
        </div>
      </div>
    </Modal>
  );
}
