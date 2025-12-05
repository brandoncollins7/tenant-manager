import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Clock, CheckCircle, Camera, Filter, Eye, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ResolveRequestModal } from '../../components/admin/ResolveRequestModal';
import { UpdateConcernModal } from '../../components/admin/UpdateConcernModal';
import { RequestDetailModal } from '../../components/requests/RequestDetailModal';
import { requestsApi } from '../../api/requests';
import { useAuth } from '../../context/AuthContext';
import {
  REQUEST_TYPE_LABELS,
  CONCERN_TYPE_LABELS,
  CONCERN_SEVERITY_LABELS,
  REQUEST_CATEGORY_LABELS,
  ConcernType,
  ConcernSeverity,
} from '../../types';
import type { Request, Concern, CombinedRequestItem } from '../../types';

const CONCERN_TYPE_ICONS: Record<ConcernType, string> = {
  NOISE: '🔊',
  CLEANLINESS: '🧹',
  HARASSMENT: '⚠️',
  PROPERTY_DAMAGE: '🔨',
  OTHER: '📋',
};

type StatusFilter = 'ALL' | 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
type CategoryFilter = 'ALL' | 'REQUEST' | 'CONCERN';

export function AdminRequestsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [selectedItem, setSelectedItem] = useState<CombinedRequestItem | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showConcernModal, setShowConcernModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: combinedItems, isLoading } = useQuery({
    queryKey: ['admin', 'requests', 'combined', statusFilter, categoryFilter],
    queryFn: () =>
      requestsApi.getAdminCombined({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
      }),
  });

  // Calculate counts
  const counts = useMemo(() => {
    if (!combinedItems) return { pending: 0, underReview: 0, resolved: 0, active: 0, highPriority: 0 };

    const pending = combinedItems.filter((item) => item.status === 'PENDING').length;
    const underReview = combinedItems.filter((item) => item.status === 'UNDER_REVIEW').length;
    const resolved = combinedItems.filter((item) =>
      item.status === 'RESOLVED' || item.status === 'DISMISSED'
    ).length;
    const highPriority = combinedItems.filter(
      (item) => item.category === 'CONCERN' && item.severity === 'HIGH' &&
        (item.status === 'PENDING' || item.status === 'UNDER_REVIEW')
    ).length;

    return {
      pending,
      underReview,
      resolved,
      active: pending + underReview,
      highPriority,
    };
  }, [combinedItems]);

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
    switch (item.status) {
      case 'PENDING':
        return (
          <Badge variant="warning">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'UNDER_REVIEW':
        return (
          <Badge variant="info">
            <Eye className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        );
      case 'RESOLVED':
        return (
          <Badge variant="success">
            <CheckCircle className="w-3 h-3 mr-1" />
            Resolved
          </Badge>
        );
      case 'DISMISSED':
        return (
          <Badge variant="default">
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

  const handleAction = (item: CombinedRequestItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item);
    if (item.category === 'REQUEST') {
      setShowResolveModal(true);
    } else {
      setShowConcernModal(true);
    }
  };

  const handleViewDetails = (item: CombinedRequestItem) => {
    setSelectedItem(item);
    if (item.category === 'REQUEST') {
      setShowDetailModal(true);
    } else {
      setShowConcernModal(true);
    }
  };

  // Convert combined item back to Request for modals
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
    tenant: selectedItem.tenant ? {
      id: selectedItem.tenant.id,
      email: selectedItem.tenant.email,
      phone: selectedItem.tenant.phone,
      startDate: '',
      isActive: true,
      occupants: [],
      room: selectedItem.tenant.room ? {
        id: selectedItem.tenant.room.id,
        roomNumber: selectedItem.tenant.room.roomNumber,
        unit: { id: '', name: '', timezone: '' },
      } : { id: '', roomNumber: '', unit: { id: '', name: '', timezone: '' } },
    } : undefined,
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
    reporter: selectedItem.tenant ? {
      id: selectedItem.tenant.id,
      email: selectedItem.tenant.email,
      phone: selectedItem.tenant.phone,
      startDate: '',
      isActive: true,
      occupants: [],
      room: selectedItem.tenant.room ? {
        id: selectedItem.tenant.room.id,
        roomNumber: selectedItem.reporterRoom || selectedItem.tenant.room.roomNumber,
        unit: { id: '', name: '', timezone: '' },
      } : { id: '', roomNumber: '', unit: { id: '', name: '', timezone: '' } },
    } : undefined,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
        <div className="mt-2 flex gap-4 text-sm flex-wrap">
          <span className="text-gray-600">
            <strong className="text-yellow-600">{counts.active}</strong> active
          </span>
          {counts.highPriority > 0 && (
            <span className="text-red-600 font-medium">
              {counts.highPriority} high priority
            </span>
          )}
          <span className="text-gray-600">
            <strong className="text-green-600">{counts.resolved}</strong> resolved
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-5 h-5 text-gray-500" />

            {/* Status filters */}
            <div className="flex gap-2 flex-wrap">
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
                variant={statusFilter === 'UNDER_REVIEW' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('UNDER_REVIEW')}
              >
                Under Review
              </Button>
              <Button
                variant={statusFilter === 'RESOLVED' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('RESOLVED')}
              >
                Resolved
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-300 hidden sm:block" />

            {/* Category filters */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={categoryFilter === 'ALL' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setCategoryFilter('ALL')}
              >
                All Types
              </Button>
              <Button
                variant={categoryFilter === 'REQUEST' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setCategoryFilter('REQUEST')}
              >
                Requests
              </Button>
              <Button
                variant={categoryFilter === 'CONCERN' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setCategoryFilter('CONCERN')}
              >
                Concerns
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* List */}
      {combinedItems && combinedItems.length > 0 ? (
        <div className="space-y-3">
          {combinedItems.map((item) => {
            const isActive = item.status === 'PENDING' || item.status === 'UNDER_REVIEW';
            const isHighPriority = item.category === 'CONCERN' && item.severity === 'HIGH' && isActive;

            return (
              <Card
                key={`${item.category}-${item.id}`}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  isHighPriority
                    ? 'border-red-300 bg-red-50'
                    : isActive
                      ? 'border-yellow-200 bg-yellow-50'
                      : ''
                }`}
                onClick={() => handleViewDetails(item)}
              >
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-2xl">{getTypeIcon(item)}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">
                              {getTypeLabel(item)}
                            </h3>
                            {getStatusBadge(item)}
                            {item.category === 'CONCERN' && item.severity && (
                              getSeverityBadge(item.severity)
                            )}
                          </div>

                          {/* Tenant info */}
                          <div className="text-sm text-gray-600 mt-1">
                            {item.category === 'REQUEST' ? (
                              item.tenant && (
                                <span>
                                  Room {item.tenant.room?.roomNumber} • {item.tenant.email}
                                </span>
                              )
                            ) : (
                              <span>
                                Room {item.reporterRoom || '?'} → About Room {item.reportedRoom || '?'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Category badge */}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.category === 'REQUEST'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {REQUEST_CATEGORY_LABELS[item.category]}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between flex-wrap gap-2">
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
                          {item.tenant?.phone && (
                            <span className="flex items-center gap-1">
                              📞 {item.tenant.phone}
                            </span>
                          )}
                        </div>

                        {isActive && (
                          <Button
                            size="sm"
                            onClick={(e) => handleAction(item, e)}
                          >
                            {item.category === 'REQUEST' ? 'Mark Resolved' : 'Update Status'}
                          </Button>
                        )}
                      </div>

                      {/* Resolution notes */}
                      {!isActive && item.notes && (
                        <div className={`mt-3 p-3 rounded-lg border ${
                          item.status === 'DISMISSED'
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-green-50 border-green-200'
                        }`}>
                          <p className={`text-sm ${
                            item.status === 'DISMISSED'
                              ? 'text-gray-700'
                              : 'text-green-800'
                          }`}>
                            <strong>Notes:</strong> {item.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardBody className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No requests found</h3>
            <p className="text-gray-600">
              {statusFilter !== 'ALL'
                ? `No ${statusFilter.toLowerCase().replace('_', ' ')} items.`
                : categoryFilter !== 'ALL'
                  ? `No ${categoryFilter.toLowerCase()}s to display.`
                  : 'Requests and concerns will appear here when tenants submit them.'}
            </p>
          </CardBody>
        </Card>
      )}

      {/* Detail Modal for Requests */}
      <RequestDetailModal
        request={showDetailModal && selectedItem?.category === 'REQUEST' ? selectedRequest : null}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedItem(null);
        }}
      />

      {/* Resolve Modal for Requests */}
      <ResolveRequestModal
        request={showResolveModal ? selectedRequest : null}
        adminEmail={user?.email || ''}
        onClose={() => {
          setShowResolveModal(false);
          setSelectedItem(null);
        }}
      />

      {/* Update Modal for Concerns */}
      <UpdateConcernModal
        concern={showConcernModal ? selectedConcern : null}
        adminEmail={user?.email || ''}
        onClose={() => {
          setShowConcernModal(false);
          setSelectedItem(null);
        }}
      />
    </div>
  );
}
