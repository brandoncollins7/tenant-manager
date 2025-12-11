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

const MAX_PHOTOS = 3;

interface PhotoState {
  file: File;
  preview: string;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'error';
  uploadedPath?: string;
}

interface CompletionModalProps {
  completion: ChoreCompletion | null;
  onClose: () => void;
}

export function CompletionModal({ completion, onClose }: CompletionModalProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [photos, setPhotos] = useState<PhotoState[]>([]);
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: uploadsApi.uploadPhoto,
  });

  const completeMutation = useMutation({
    mutationFn: ({
      completionId,
      photoPaths,
      notes,
    }: {
      completionId: string;
      photoPaths?: string[];
      notes?: string;
    }) => choresApi.markComplete(completionId, photoPaths, notes),
    onSuccess: () => {
      // Track successful completion
      if (completion) {
        trackEvent(EVENTS.CHORE_COMPLETED, {
          choreId: completion.chore.id,
          choreName: completion.chore.name,
          hasNotes: !!notes,
          photoCount: photos.length,
        });
      }

      // Use centralized invalidation to refresh all chore-related queries
      invalidateChoreQueries(queryClient);
      handleClose();
    },
  });

  const handlePhotoCapture = (file: File) => {
    // Track that user started completion (on first photo)
    if (photos.length === 0 && completion) {
      trackEvent(EVENTS.CHORE_COMPLETION_STARTED, {
        choreId: completion.chore.id,
        choreName: completion.chore.name,
      });
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotos((prev) => [
        ...prev,
        {
          file,
          preview: reader.result as string,
          uploadStatus: 'pending',
        },
      ]);
    };
    reader.readAsDataURL(file);
    setShowCamera(false);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!completion) return;

    try {
      setIsUploading(true);

      // Upload all pending photos
      const uploadedPaths: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (photo.uploadStatus === 'pending') {
          // Update status to uploading
          setPhotos((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, uploadStatus: 'uploading' as const } : p
            )
          );

          try {
            const result = await uploadMutation.mutateAsync(photo.file);
            uploadedPaths.push(result.filename);
            // Update status to uploaded
            setPhotos((prev) =>
              prev.map((p, idx) =>
                idx === i
                  ? { ...p, uploadStatus: 'uploaded' as const, uploadedPath: result.filename }
                  : p
              )
            );
          } catch {
            // Update status to error
            setPhotos((prev) =>
              prev.map((p, idx) =>
                idx === i ? { ...p, uploadStatus: 'error' as const } : p
              )
            );
            throw new Error('Failed to upload photo');
          }
        } else if (photo.uploadedPath) {
          uploadedPaths.push(photo.uploadedPath);
        }
      }

      await completeMutation.mutateAsync({
        completionId: completion.id,
        photoPaths: uploadedPaths.length > 0 ? uploadedPaths : undefined,
        notes: notes || undefined,
      });
    } catch (error) {
      console.error('Failed to complete chore:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Track cancellation if user had started but didn't submit
    if (photos.length > 0 && completion && !completeMutation.isSuccess) {
      trackEvent(EVENTS.CHORE_COMPLETION_CANCELLED, {
        choreId: completion.chore.id,
        choreName: completion.chore.name,
      });
    }

    setPhotos([]);
    setNotes('');
    setShowCamera(false);
    onClose();
  };

  const isLoading = isUploading || completeMutation.isPending;

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
            Photo Proof (optional, up to {MAX_PHOTOS})
          </label>

          {/* Photo Grid */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={photo.preview}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />

                {/* Upload status indicator */}
                {photo.uploadStatus === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {photo.uploadStatus === 'uploaded' && (
                  <div className="absolute top-1 left-1 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">
                    ✓
                  </div>
                )}

                {photo.uploadStatus === 'error' && (
                  <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center rounded-lg">
                    <span className="text-white text-xs font-medium">Failed</span>
                  </div>
                )}

                {/* Remove button */}
                {!isLoading && (
                  <button
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center text-sm hover:bg-black/90"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {/* Add photo button */}
            {photos.length < MAX_PHOTOS && (
              <button
                onClick={() => setShowCamera(true)}
                disabled={isLoading}
                className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-2xl">📸</span>
                <span className="text-xs mt-1">
                  {photos.length === 0 ? 'Add Photo' : 'Add More'}
                </span>
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500">
            {photos.length}/{MAX_PHOTOS} photos added
          </p>
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
            disabled={isLoading}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={isLoading}>
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
