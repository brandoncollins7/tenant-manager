import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Clock, CheckCircle, Camera, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ResolveRequestModal } from '../../components/admin/ResolveRequestModal';
import { RequestDetailModal } from '../../components/requests/RequestDetailModal';
import { requestsApi } from '../../api/requests';
import { useAuth } from '../../context/AuthContext';
import { REQUEST_TYPE_LABELS } from '../../types';
import type { Request } from '../../types';

export function AdminRequestsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CLEANING_SUPPLIES' | 'MAINTENANCE_ISSUE'>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin', 'requests', statusFilter, typeFilter],
    queryFn: () =>
      requestsApi.getAll({
        status: statusFilter === 'ALL' ? undefined : (statusFilter as any),
        type: typeFilter === 'ALL' ? undefined : (typeFilter as any),
      }),
  });

  const getTypeIcon = (type: string) => {
    return type === 'CLEANING_SUPPLIES' ? '🧹' : '🔧';
  };

  const handleResolve = (request: Request) => {
    setSelectedRequest(request);
    setShowResolveModal(true);
  };

  const handleViewDetails = (request: Request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const pendingCount = requests?.filter((r) => r.status === 'PENDING').length || 0;
  const resolvedCount = requests?.filter((r) => r.status === 'RESOLVED').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
        <div className="mt-2 flex gap-4 text-sm">
          <span className="text-gray-600">
            <strong className="text-yellow-600">{pendingCount}</strong> pending
          </span>
          <span className="text-gray-600">
            <strong className="text-green-600">{resolvedCount}</strong> resolved
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-5 h-5 text-gray-500" />
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'ALL' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('ALL')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'PENDING' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('PENDING')}
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === 'RESOLVED' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('RESOLVED')}
              >
                Resolved
              </Button>
            </div>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex gap-2">
              <Button
                variant={typeFilter === 'ALL' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTypeFilter('ALL')}
              >
                All Types
              </Button>
              <Button
                variant={typeFilter === 'CLEANING_SUPPLIES' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTypeFilter('CLEANING_SUPPLIES')}
              >
                🧹 Supplies
              </Button>
              <Button
                variant={typeFilter === 'MAINTENANCE_ISSUE' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTypeFilter('MAINTENANCE_ISSUE')}
              >
                🔧 Maintenance
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Request List */}
      {requests && requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card
              key={request.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${request.status === 'PENDING' ? 'border-yellow-200 bg-yellow-50' : ''}`}
              onClick={() => handleViewDetails(request)}
            >
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
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
                      <div className="ml-auto">
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

                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {request.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>
                          {formatDistanceToNow(new Date(request.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {request.photoPath && (
                          <span className="flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            Photo attached
                          </span>
                        )}
                        {request.tenant?.phone && (
                          <span className="flex items-center gap-1">
                            📞 {request.tenant.phone}
                          </span>
                        )}
                      </div>

                      {request.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolve(request);
                          }}
                        >
                          Mark as Resolved
                        </Button>
                      )}
                    </div>

                    {request.status === 'RESOLVED' && request.notes && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>Resolution:</strong> {request.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardBody className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No requests found</h3>
            <p className="text-gray-600">
              {statusFilter === 'PENDING'
                ? 'No pending requests at the moment.'
                : statusFilter === 'RESOLVED'
                ? 'No resolved requests to display.'
                : 'Requests will appear here when tenants submit them.'}
            </p>
          </CardBody>
        </Card>
      )}

      {/* Detail Modal */}
      <RequestDetailModal
        request={showDetailModal ? selectedRequest : null}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedRequest(null);
        }}
      />

      {/* Resolve Modal */}
      <ResolveRequestModal
        request={showResolveModal ? selectedRequest : null}
        adminEmail={user?.email || ''}
        onClose={() => {
          setShowResolveModal(false);
          setSelectedRequest(null);
        }}
      />
    </div>
  );
}
