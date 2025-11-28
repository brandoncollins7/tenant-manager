import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Camera, Clock, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { requestsApi } from '../api/requests';
import { useAuth } from '../context/AuthContext';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { CreateRequestModal } from '../components/requests/CreateRequestModal';
import { RequestDetailModal } from '../components/requests/RequestDetailModal';
import { REQUEST_TYPE_LABELS } from '../types';
import type { Request } from '../types';

export function RequestsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['requests', user?.id],
    queryFn: () => requestsApi.getAll({ tenantId: user!.id }),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const pendingRequests = requests?.filter((r) => r.status === 'PENDING');
  const resolvedRequests = requests?.filter((r) => r.status === 'RESOLVED');

  const displayRequests = activeTab === 'pending' ? pendingRequests : resolvedRequests;

  const getTypeIcon = (type: string) => {
    return type === 'CLEANING_SUPPLIES' ? '🧹' : '🔧';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <MessageSquare className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending {pendingRequests && pendingRequests.length > 0 && `(${pendingRequests.length})`}
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'resolved'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Resolved {resolvedRequests && resolvedRequests.length > 0 && `(${resolvedRequests.length})`}
        </button>
      </div>

      {/* Request List */}
      {displayRequests && displayRequests.length > 0 ? (
        <div className="space-y-3">
          {displayRequests.map((request) => (
            <Card
              key={request.id}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                request.status === 'PENDING' ? 'border-yellow-200 bg-yellow-50' : ''
              }`}
              onClick={() => setSelectedRequest(request)}
            >
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{getTypeIcon(request.type)}</span>
                      <p className="font-semibold text-gray-900">
                        {REQUEST_TYPE_LABELS[request.type]}
                      </p>
                      {request.status === 'PENDING' ? (
                        <Badge variant="warning" size="sm">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                      {request.description}
                    </p>
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
                    </div>
                    {request.status === 'RESOLVED' && request.resolvedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Resolved{' '}
                        {formatDistanceToNow(new Date(request.resolvedAt), {
                          addSuffix: true,
                        })}
                      </p>
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
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {activeTab === 'pending' ? 'No pending requests' : 'No resolved requests'}
            </h3>
            <p className="text-gray-600 mb-4">
              {activeTab === 'pending'
                ? 'Submit a request for cleaning supplies or report a maintenance issue.'
                : 'Resolved requests will appear here.'}
            </p>
            {activeTab === 'pending' && (
              <Button onClick={() => setShowCreateModal(true)}>
                Create Request
              </Button>
            )}
          </CardBody>
        </Card>
      )}

      {/* Modals */}
      <CreateRequestModal
        tenantId={user!.id}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      <RequestDetailModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
}
