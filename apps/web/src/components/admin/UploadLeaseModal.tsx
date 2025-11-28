import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, FileText } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { tenantsApi } from '../../api/tenants';

interface UploadLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
}

export function UploadLeaseModal({
  isOpen,
  onClose,
  tenantId,
  tenantName,
}: UploadLeaseModalProps) {
  const queryClient = useQueryClient();
  const [leaseFile, setLeaseFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  const uploadMutation = useMutation({
    mutationFn: () => tenantsApi.uploadLease(tenantId, leaseFile!, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['lease-history', tenantId] });
      handleClose();
    },
  });

  const handleClose = () => {
    setLeaseFile(null);
    setNotes('');
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setLeaseFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (leaseFile) {
      uploadMutation.mutate();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Upload Lease - ${tenantName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lease Agreement PDF
          </label>
          {leaseFile ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                <span className="text-sm text-gray-700 truncate max-w-[200px]">
                  {leaseFile.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLeaseFile(null)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <Upload className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-sm text-gray-500">Click to upload PDF</span>
              <span className="text-xs text-gray-400">Max 10MB</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        <Input
          label="Version Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Rent increase amendment, Pet addendum, etc."
        />

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={!leaseFile || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Lease'}
          </Button>
        </div>

        {uploadMutation.isError && (
          <p className="text-sm text-red-600 text-center">
            {(uploadMutation.error as Error)?.message || 'Failed to upload lease'}
          </p>
        )}
      </form>
    </Modal>
  );
}
