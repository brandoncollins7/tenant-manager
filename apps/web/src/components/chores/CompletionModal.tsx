import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PhotoCapture } from './PhotoCapture';
import { uploadsApi } from '../../api/uploads';
import { choresApi } from '../../api/chores';
import { trackEvent, EVENTS } from '../../utils/analytics';
import { invalidateChoreQueries } from '../../utils/queryKeys';
import type { ChoreCompletion } from '../../types';

interface CompletionModalProps {
  completion: ChoreCompletion | null;
  onClose: () => void;
}

export function CompletionModal({ completion, onClose }: CompletionModalProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: uploadsApi.uploadPhoto,
  });

  const completeMutation = useMutation({
    mutationFn: ({
      completionId,
      photoPath,
      notes,
    }: {
      completionId: string;
      photoPath?: string;
      notes?: string;
    }) => choresApi.markComplete(completionId, photoPath, notes),
    onSuccess: () => {
      // Track successful completion
      if (completion) {
        trackEvent(EVENTS.CHORE_COMPLETED, {
          choreId: completion.chore.id,
          choreName: completion.chore.name,
          hasNotes: !!notes,
          hasPhoto: !!photoFile,
        });
      }

      // Use centralized invalidation to refresh all chore-related queries
      invalidateChoreQueries(queryClient);
      handleClose();
    },
  });

  const handlePhotoCapture = (file: File) => {
    // Track that user started completion
    if (completion) {
      trackEvent(EVENTS.CHORE_COMPLETION_STARTED, {
        choreId: completion.chore.id,
        choreName: completion.chore.name,
      });
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setShowCamera(false);
  };

  const handleSubmit = async () => {
    if (!completion) return;

    try {
      let photoPath: string | undefined;

      if (photoFile) {
        const uploadResult = await uploadMutation.mutateAsync(photoFile);
        photoPath = uploadResult.filename;
      }

      await completeMutation.mutateAsync({
        completionId: completion.id,
        photoPath,
        notes: notes || undefined,
      });
    } catch (error) {
      console.error('Failed to complete chore:', error);
    }
  };

  const handleClose = () => {
    // Track cancellation if user had started but didn't submit
    if (photoFile && completion && !completeMutation.isSuccess) {
      trackEvent(EVENTS.CHORE_COMPLETION_CANCELLED, {
        choreId: completion.chore.id,
        choreName: completion.chore.name,
      });
    }

    setPhotoFile(null);
    setPhotoPreview(null);
    setNotes('');
    setShowCamera(false);
    onClose();
  };

  const isLoading = uploadMutation.isPending || completeMutation.isPending;

  if (showCamera) {
    return (
      <PhotoCapture
        onCapture={handlePhotoCapture}
        onCancel={() => setShowCamera(false)}
      />
    );
  }

  return (
    <Modal
      isOpen={!!completion}
      onClose={handleClose}
      title={`Complete: ${completion?.chore.name}`}
    >
      <div className="space-y-4">
        {/* Photo Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photo Proof (optional)
          </label>
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                onClick={() => setShowCamera(true)}
                className="absolute bottom-2 right-2 px-3 py-1 bg-black/70 text-white text-sm rounded-full"
              >
                Retake
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCamera(true)}
              className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors"
            >
              <span className="text-4xl mb-2">📸</span>
              <span>Tap to take photo</span>
            </button>
          )}
        </div>

        {/* Notes Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="success"
            className="flex-1"
            onClick={handleSubmit}
            disabled={isLoading}
            isLoading={isLoading}
          >
            Mark Complete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
