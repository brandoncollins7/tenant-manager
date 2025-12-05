import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PhotoCapture } from '../chores/PhotoCapture';
import { uploadsApi } from '../../api/uploads';
import { concernsApi } from '../../api/concerns';
import {
  CONCERN_TYPE_LABELS,
  CONCERN_SEVERITY_LABELS,
  ConcernType,
  ConcernSeverity,
} from '../../types';

interface CreateConcernModalProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
}

const CONCERN_TYPE_ICONS: Record<ConcernType, string> = {
  NOISE: '🔊',
  CLEANLINESS: '🧹',
  HARASSMENT: '⚠️',
  PROPERTY_DAMAGE: '🔨',
  OTHER: '📋',
};

const CONCERN_TYPE_DESCRIPTIONS: Record<ConcernType, string> = {
  NOISE: 'Excessive noise or disturbances',
  CLEANLINESS: 'Not doing chores or cleanliness issues',
  HARASSMENT: 'Inappropriate behavior or conflicts',
  PROPERTY_DAMAGE: 'Damage to shared spaces',
  OTHER: 'Other issues not listed',
};

export function CreateConcernModal({
  tenantId,
  isOpen,
  onClose,
}: CreateConcernModalProps) {
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [selectedType, setSelectedType] = useState<ConcernType | null>(null);
  const [selectedSeverity, setSelectedSeverity] =
    useState<ConcernSeverity>('MEDIUM');
  const [description, setDescription] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: reportableTenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['reportable-tenants', tenantId],
    queryFn: () => concernsApi.getReportableTenants(tenantId),
    enabled: isOpen && !!tenantId,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadsApi.uploadPhoto,
  });

  const createMutation = useMutation({
    mutationFn: ({
      reportedId,
      type,
      description,
      severity,
      photoPath,
    }: {
      reportedId: string;
      type: ConcernType;
      description: string;
      severity: ConcernSeverity;
      photoPath?: string;
    }) =>
      concernsApi.create(
        tenantId,
        reportedId,
        type,
        description,
        severity,
        photoPath
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concerns'] });
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
    if (!selectedTenant || !selectedType || !description.trim()) return;

    try {
      let photoPath: string | undefined;

      if (photoFile) {
        const uploadResult = await uploadMutation.mutateAsync(photoFile);
        photoPath = uploadResult.filename;
      }

      await createMutation.mutateAsync({
        reportedId: selectedTenant,
        type: selectedType,
        description: description.trim(),
        severity: selectedSeverity,
        photoPath,
      });
    } catch (error) {
      console.error('Failed to raise concern:', error);
    }
  };

  const handleClose = () => {
    setSelectedTenant('');
    setSelectedType(null);
    setSelectedSeverity('MEDIUM');
    setDescription('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowCamera(false);
    onClose();
  };

  const isSubmitDisabled =
    !selectedTenant ||
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Raise a Concern">
      <div className="space-y-6">
        {/* Tenant Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Which room is this about? <span className="text-red-500">*</span>
          </label>
          {tenantsLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full" />
            </div>
          ) : reportableTenants && reportableTenants.length > 0 ? (
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select a room...</option>
              {reportableTenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  Room {tenant.roomNumber}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-600">
              No other tenants in your unit.
            </p>
          )}
        </div>

        {/* Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type of concern <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2">
            {(Object.keys(CONCERN_TYPE_LABELS) as ConcernType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedType === type
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{CONCERN_TYPE_ICONS[type]}</span>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {CONCERN_TYPE_LABELS[type]}
                    </p>
                    <p className="text-xs text-gray-600">
                      {CONCERN_TYPE_DESCRIPTIONS[type]}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Severity Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How urgent is this?
          </label>
          <div className="flex gap-2">
            {(Object.keys(CONCERN_SEVERITY_LABELS) as ConcernSeverity[]).map(
              (severity) => (
                <button
                  key={severity}
                  type="button"
                  onClick={() => setSelectedSeverity(severity)}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    selectedSeverity === severity
                      ? severity === 'HIGH'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : severity === 'MEDIUM'
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {CONCERN_SEVERITY_LABELS[severity]}
                </button>
              )
            )}
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
            placeholder="Please describe the issue in detail..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Evidence Photo (Optional)
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
              Add Photo
            </Button>
          )}
        </div>

        {/* Privacy Note */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-1">Privacy Note</p>
          <p>
            This concern will only be visible to management. The tenant you are
            reporting will not be notified or see this report.
          </p>
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
            Submit Concern
          </Button>
        </div>
      </div>
    </Modal>
  );
}
