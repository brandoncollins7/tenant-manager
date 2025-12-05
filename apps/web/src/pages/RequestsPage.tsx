import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Camera, Clock, CheckCircle, Eye, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { requestsApi } from '../api/requests';
import { useAuth } from '../context/AuthContext';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { CreateRequestModal } from '../components/requests/CreateRequestModal';
import { RequestDetailModal } from '../components/requests/RequestDetailModal';
import { ConcernDetailModal } from '../components/concerns/ConcernDetailModal';
import {
  REQUEST_TYPE_LABELS,
  CONCERN_TYPE_LABELS,
  CONCERN_SEVERITY_LABELS,
  REQUEST_CATEGORY_LABELS,
  ConcernType,
  ConcernSeverity,
} from '../types';
import type { Request, Concern, CombinedRequestItem } from '../types';

const CONCERN_TYPE_ICONS: Record<ConcernType, string> = {
  NOISE: '🔊',
  CLEANLINESS: '🧹',
  HARASSMENT: '⚠️',
  PROPERTY_DAMAGE: '🔨',
  OTHER: '📋',
};

type FilterTab = 'all' | 'active' | 'closed';

export function RequestsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [selectedItem, setSelectedItem] = useState<CombinedRequestItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: combinedItems, isLoading } = useQuery({
    queryKey: ['requests', 'combined', user?.id],
    queryFn: () => requestsApi.getCombined(user!.id),
    enabled: !!user,
  });

  const filteredItems = useMemo(() => {
    if (!combinedItems) return [];

    switch (activeTab) {
      case 'active':
        return combinedItems.filter((item) =>
          item.category === 'REQUEST'
            ? item.status === 'PENDING'
            : item.status === 'PENDING' || item.status === 'UNDER_REVIEW'
        );
      case 'closed':
        return combinedItems.filter((item) =>
          item.category === 'REQUEST'
            ? item.status === 'RESOLVED'
            : item.status === 'RESOLVED' || item.status === 'DISMISSED'
        );
      default:
        return combinedItems;
    }
  }, [combinedItems, activeTab]);

  const counts = useMemo(() => {
    if (!combinedItems) return { active: 0, closed: 0 };

    const active = combinedItems.filter((item) =>
      item.category === 'REQUEST'
        ? item.status === 'PENDING'
        : item.status === 'PENDING' || item.status === 'UNDER_REVIEW'
    ).length;

    const closed = combinedItems.filter((item) =>
      item.category === 'REQUEST'
        ? item.status === 'RESOLVED'
        : item.status === 'RESOLVED' || item.status === 'DISMISSED'
    ).length;

    return { active, closed };
  }, [combinedItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const getTypeIcon = (item: CombinedRequestItem) => {
    if (item.category === 'REQUEST') {
      return item.type === 'CLEANING_SUPPLIES' ? '🧹' : '🔧';
    }
    return CONCERN_TYPE_ICONS[item.type as ConcernType] || '📋';
  };

  const getTypeLabel = (item: CombinedRequestItem) => {
    if (item.category === 'REQUEST') {
      return REQUEST_TYPE_LABELS[item.type] || item.type;
    }
    return CONCERN_TYPE_LABELS[item.type as ConcernType] || item.type;
  };

  const getStatusBadge = (item: CombinedRequestItem) => {
    if (item.category === 'REQUEST') {
      if (item.status === 'PENDING') {
        return (
          <Badge variant="warning" size="sm">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      }
      return (
        <Badge variant="success" size="sm">
          <CheckCircle className="w-3 h-3 mr-1" />
          Resolved
        </Badge>
      );
    }

    // Concern statuses
    switch (item.status) {
      case 'PENDING':
        return (
          <Badge variant="warning" size="sm">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'UNDER_REVIEW':
        return (
          <Badge variant="info" size="sm">
            <Eye className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        );
      case 'RESOLVED':
        return (
          <Badge variant="success" size="sm">
            <CheckCircle className="w-3 h-3 mr-1" />
            Resolved
          </Badge>
        );
      case 'DISMISSED':
        return (
          <Badge variant="default" size="sm">
            <XCircle className="w-3 h-3 mr-1" />
            Dismissed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getSeverityBadge = (severity: ConcernSeverity) => {
    const colors = {
      HIGH: 'text-red-600 bg-red-100',
      MEDIUM: 'text-yellow-600 bg-yellow-100',
      LOW: 'text-green-600 bg-green-100',
    };

    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[severity]}`}>
        {CONCERN_SEVERITY_LABELS[severity]}
      </span>
    );
  };

  const handleItemClick = (item: CombinedRequestItem) => {
    setSelectedItem(item);
  };

  // Convert combined item back to Request/Concern for detail modals
  const selectedRequest: Request | null = selectedItem?.category === 'REQUEST' ? {
    id: selectedItem.id,
    type: selectedItem.type as 'CLEANING_SUPPLIES' | 'MAINTENANCE_ISSUE',
    description: selectedItem.description,
    photoPath: selectedItem.photoPath,
    status: selectedItem.status as 'PENDING' | 'RESOLVED',
    createdAt: selectedItem.createdAt,
    updatedAt: selectedItem.createdAt,
    resolvedAt: selectedItem.resolvedAt,
    resolvedBy: selectedItem.resolvedBy,
    notes: selectedItem.notes,
  } : null;

  const selectedConcern: Concern | null = selectedItem?.category === 'CONCERN' ? {
    id: selectedItem.id,
    type: selectedItem.type as ConcernType,
    severity: selectedItem.severity as ConcernSeverity,
    description: selectedItem.description,
    photoPath: selectedItem.photoPath,
    status: selectedItem.status as any,
    createdAt: selectedItem.createdAt,
    updatedAt: selectedItem.createdAt,
    resolvedAt: selectedItem.resolvedAt,
    resolvedBy: selectedItem.resolvedBy,
    notes: selectedItem.notes,
    reported: {
      id: '',
      email: '',
      startDate: '',
      isActive: true,
      occupants: [],
      room: {
        id: '',
        roomNumber: selectedItem.reportedRoom || '',
        unit: { id: '', name: '', timezone: '' },
      },
    },
  } : null;

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
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'active'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Active {counts.active > 0 && `(${counts.active})`}
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'closed'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Closed {counts.closed > 0 && `(${counts.closed})`}
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          All
        </button>
      </div>

      {/* Request List */}
      {filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <Card
              key={`${item.category}-${item.id}`}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                (item.category === 'REQUEST' && item.status === 'PENDING') ||
                (item.category === 'CONCERN' && (item.status === 'PENDING' || item.status === 'UNDER_REVIEW'))
                  ? item.category === 'CONCERN' && item.severity === 'HIGH'
                    ? 'border-red-200 bg-red-50'
                    : 'border-yellow-200 bg-yellow-50'
                  : ''
              }`}
              onClick={() => handleItemClick(item)}
            >
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xl">{getTypeIcon(item)}</span>
                      <p className="font-semibold text-gray-900">
                        {getTypeLabel(item)}
                      </p>
                      {getStatusBadge(item)}
                      {item.category === 'CONCERN' && item.severity && (
                        getSeverityBadge(item.severity)
                      )}
                    </div>

                    {/* Category indicator */}
                    <div className="mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.category === 'REQUEST'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {REQUEST_CATEGORY_LABELS[item.category]}
                      </span>
                      {item.category === 'CONCERN' && item.reportedRoom && (
                        <span className="text-xs text-gray-500 ml-2">
                          About Room {item.reportedRoom}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {item.photoPath && (
                        <span className="flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          Photo
                        </span>
                      )}
                    </div>
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
              {activeTab === 'active' ? 'No active requests' : activeTab === 'closed' ? 'No closed requests' : 'No requests yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {activeTab === 'active'
                ? 'Submit a request for supplies, maintenance, or report a tenant concern.'
                : 'Your completed and resolved requests will appear here.'}
            </p>
            {activeTab !== 'closed' && (
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
        onClose={() => setSelectedItem(null)}
      />
      <ConcernDetailModal
        concern={selectedConcern}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
