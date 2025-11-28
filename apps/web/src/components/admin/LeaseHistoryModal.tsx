import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { tenantsApi } from '../../api/tenants';
import { LeaseDocument } from '../../types';
import { extractErrorMessage } from '../../utils/errors';

interface LeaseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
}

export function LeaseHistoryModal({
  isOpen,
  onClose,
  tenantId,
  tenantName,
}: LeaseHistoryModalProps) {
  const [downloadingVersion, setDownloadingVersion] = useState<number | null>(null);

  const { data: leases, isLoading } = useQuery<LeaseDocument[]>({
    queryKey: ['lease-history', tenantId],
    queryFn: () => tenantsApi.getLeaseHistory(tenantId),
    enabled: isOpen,
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = async (version: number) => {
    setDownloadingVersion(version);
    try {
      const blob = await tenantsApi.getLeaseVersionBlob(tenantId, version);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setDownloadingVersion(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Lease History - ${tenantName}`}>
      <div className="space-y-4">
        {isLoading && (
          <p className="text-gray-500 text-center py-8">Loading lease history...</p>
        )}

        {!isLoading && leases?.length === 0 && (
          <p className="text-gray-500 text-center py-8">No lease documents found</p>
        )}

        {!isLoading && leases && leases.length > 0 && (
          <div className="space-y-3">
            {leases.map((lease) => (
              <div
                key={lease.id}
                className={`border rounded-lg p-4 ${
                  lease.isCurrent
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-primary-600" />
                      <span className="font-semibold text-gray-900">
                        Version {lease.version}
                      </span>
                      {lease.isCurrent && (
                        <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(lease.uploadedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{lease.uploadedBy}</span>
                      </div>
                      {lease.notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-gray-700 italic">
                          "{lease.notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(lease.version)}
                    disabled={downloadingVersion === lease.version}
                    className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {downloadingVersion === lease.version ? (
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
