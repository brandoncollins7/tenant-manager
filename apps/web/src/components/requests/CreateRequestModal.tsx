import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PhotoCapture } from '../chores/PhotoCapture';
import { uploadsApi } from '../../api/uploads';
import { requestsApi } from '../../api/requests';
import { REQUEST_TYPE_LABELS } from '../../types';

interface CreateRequestModalProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRequestModal({
  tenantId,
  isOpen,
  onClose,
}: CreateRequestModalProps) {
  const [selectedType, setSelectedType] = useState<
    'CLEANING_SUPPLIES' | 'MAINTENANCE_ISSUE' | null
  >(null);
  const [description, setDescription] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: uploadsApi.uploadPhoto,
  });

  const createMutation = useMutation({
    mutationFn: ({
      type,
      description,
      photoPath,
    }: {
      type: 'CLEANING_SUPPLIES' | 'MAINTENANCE_ISSUE';
      description: string;
      photoPath?: string;
    }) => requestsApi.create(tenantId, type, description, photoPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      handleClose();
    },
  });

  const handlePhotoCapture = (file: File) => {
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setShowCamera(false);
  };

  const handleSubmit = async () => {
    if (!selectedType || !description.trim()) return;

    try {
      let photoPath: string | undefined;

      if (photoFile) {
        const uploadResult = await uploadMutation.mutateAsync(photoFile);
        photoPath = uploadResult.filename;
      }

      await createMutation.mutateAsync({
        type: selectedType,
        description: description.trim(),
        photoPath,
      });
    } catch (error) {
      console.error('Failed to create request:', error);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setDescription('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowCamera(false);
    onClose();
  };

  const isSubmitDisabled =
    !selectedType ||
    !description.trim() ||
    uploadMutation.isPending ||
    createMutation.isPending;

  if (showCamera) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowCamera(false)}>
        <PhotoCapture
          onCapture={handlePhotoCapture}
          onCancel={() => setShowCamera(false)}
        />
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Request">
      <div className="space-y-6">
        {/* Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What do you need? <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedType('CLEANING_SUPPLIES')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedType === 'CLEANING_SUPPLIES'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧹</span>
                <div>
                  <p className="font-semibold text-gray-900">
                    {REQUEST_TYPE_LABELS.CLEANING_SUPPLIES}
                  </p>
                  <p className="text-xs text-gray-600">
                    Paper towels, soap, etc.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('MAINTENANCE_ISSUE')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedType === 'MAINTENANCE_ISSUE'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔧</span>
                <div>
                  <p className="font-semibold text-gray-900">
                    {REQUEST_TYPE_LABELS.MAINTENANCE_ISSUE}
                  </p>
                  <p className="text-xs text-gray-600">
                    Report a problem
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              selectedType === 'CLEANING_SUPPLIES'
                ? 'What supplies do you need?'
                : 'Please describe the issue...'
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photo (Optional)
          </label>
          {photoPreview ? (
            <div className="space-y-2">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
              >
                Remove Photo
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setShowCamera(true)}>
              📸 Add Photo
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleClose}
            disabled={uploadMutation.isPending || createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            isLoading={uploadMutation.isPending || createMutation.isPending}
          >
            Submit Request
          </Button>
        </div>
      </div>
    </Modal>
  );
}
