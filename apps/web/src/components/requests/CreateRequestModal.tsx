import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PhotoCapture } from '../chores/PhotoCapture';
import { uploadsApi } from '../../api/uploads';
import { requestsApi } from '../../api/requests';
import { concernsApi } from '../../api/concerns';
import {
  REQUEST_TYPE_LABELS,
  CONCERN_TYPE_LABELS,
  CONCERN_SEVERITY_LABELS,
  ConcernType,
  ConcernSeverity,
} from '../../types';

interface CreateRequestModalProps {
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

type Step = 'category' | 'request-form' | 'concern-form';

export function CreateRequestModal({
  tenantId,
  isOpen,
  onClose,
}: CreateRequestModalProps) {
  const [step, setStep] = useState<Step>('category');

  // Request state
  const [selectedRequestType, setSelectedRequestType] = useState<
    'CLEANING_SUPPLIES' | 'MAINTENANCE_ISSUE' | null
  >(null);

  // Concern state
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [selectedConcernType, setSelectedConcernType] = useState<ConcernType | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<ConcernSeverity>('MEDIUM');

  // Shared state
  const [description, setDescription] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: reportableTenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['reportable-tenants', tenantId],
    queryFn: () => requestsApi.getReportableTenants(tenantId),
    enabled: isOpen && !!tenantId && step === 'concern-form',
  });

  const uploadMutation = useMutation({
    mutationFn: uploadsApi.uploadPhoto,
  });

  const createRequestMutation = useMutation({
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

  const createConcernMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['requests'] });
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

  const handleSubmitRequest = async () => {
    if (!selectedRequestType || !description.trim()) return;

    try {
      let photoPath: string | undefined;

      if (photoFile) {
        const uploadResult = await uploadMutation.mutateAsync(photoFile);
        photoPath = uploadResult.filename;
      }

      await createRequestMutation.mutateAsync({
        type: selectedRequestType,
        description: description.trim(),
        photoPath,
      });
    } catch (error) {
      console.error('Failed to create request:', error);
    }
  };

  const handleSubmitConcern = async () => {
    if (!selectedTenant || !selectedConcernType || !description.trim()) return;

    try {
      let photoPath: string | undefined;

      if (photoFile) {
        const uploadResult = await uploadMutation.mutateAsync(photoFile);
        photoPath = uploadResult.filename;
      }

      await createConcernMutation.mutateAsync({
        reportedId: selectedTenant,
        type: selectedConcernType,
        description: description.trim(),
        severity: selectedSeverity,
        photoPath,
      });
    } catch (error) {
      console.error('Failed to raise concern:', error);
    }
  };

  const handleClose = () => {
    setStep('category');
    setSelectedRequestType(null);
    setSelectedTenant('');
    setSelectedConcernType(null);
    setSelectedSeverity('MEDIUM');
    setDescription('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowCamera(false);
    onClose();
  };

  const handleBack = () => {
    setStep('category');
    // Reset form state but keep the modal open
    setSelectedRequestType(null);
    setSelectedTenant('');
    setSelectedConcernType(null);
    setSelectedSeverity('MEDIUM');
    setDescription('');
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const isRequestSubmitDisabled =
    !selectedRequestType ||
    !description.trim() ||
    uploadMutation.isPending ||
    createRequestMutation.isPending;

  const isConcernSubmitDisabled =
    !selectedTenant ||
    !selectedConcernType ||
    !description.trim() ||
    uploadMutation.isPending ||
    createConcernMutation.isPending;

  const isPending =
    uploadMutation.isPending ||
    createRequestMutation.isPending ||
    createConcernMutation.isPending;

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

  // Step 1: Category Selection
  if (step === 'category') {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="New Request">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            What would you like to submit?
          </p>

          <button
            type="button"
            onClick={() => setStep('request-form')}
            className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">📋</span>
              <div>
                <p className="font-semibold text-gray-900">General Request</p>
                <p className="text-sm text-gray-600">
                  Cleaning supplies, maintenance issues
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStep('concern-form')}
            className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <p className="font-semibold text-gray-900">Tenant Concern</p>
                <p className="text-sm text-gray-600">
                  Report an issue with another tenant (private)
                </p>
              </div>
            </div>
          </button>

          <div className="pt-2">
            <Button variant="secondary" className="w-full" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Step 2a: Request Form
  if (step === 'request-form') {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="General Request">
        <div className="space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What do you need? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRequestType('CLEANING_SUPPLIES')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedRequestType === 'CLEANING_SUPPLIES'
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
                onClick={() => setSelectedRequestType('MAINTENANCE_ISSUE')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedRequestType === 'MAINTENANCE_ISSUE'
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
                selectedRequestType === 'CLEANING_SUPPLIES'
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
                Add Photo
              </Button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleBack}
              disabled={isPending}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmitRequest}
              disabled={isRequestSubmitDisabled}
              isLoading={isPending}
            >
              Submit
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Step 2b: Concern Form
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Tenant Concern">
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
                onClick={() => setSelectedConcernType(type)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedConcernType === type
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
            htmlFor="concern-description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="concern-description"
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
            onClick={handleBack}
            disabled={isPending}
          >
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmitConcern}
            disabled={isConcernSubmitDisabled}
            isLoading={isPending}
          >
            Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
}
