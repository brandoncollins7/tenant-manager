import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Wrench,
  ShoppingCart,
  Clock,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiClient } from '../../api/client';

interface DashboardStats {
  pendingRequests: number;
  overdueChores: number;
  completionRate: number;
}

interface PendingRequest {
  id: string;
  type: 'CLEANING_SUPPLIES' | 'MAINTENANCE_ISSUE';
  description: string;
  createdAt: string;
  tenantName: string;
  unitName: string;
}

interface OverdueChore {
  id: string;
  occupantName: string;
  choreName: string;
  weekId: string;
  weekStart: string;
  roomNumber?: string;
  unitName?: string;
}

interface DashboardData {
  stats: DashboardStats;
  pendingRequests: PendingRequest[];
  overdueChores: OverdueChore[];
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatWeekLabel(weekStart: string): string {
  const date = new Date(weekStart);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' week';
}

export function AdminDashboardPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/stats/dashboard');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = data?.stats ?? { pendingRequests: 0, overdueChores: 0, completionRate: 0 };
  const pendingRequests = data?.pendingRequests ?? [];
  const overdueChores = data?.overdueChores ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of actionable items</p>
      </div>

      {/* Stats Grid - 3 cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/admin/requests')}
        >
          <CardBody className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900">{stats.pendingRequests}</p>
                <p className="text-xs text-gray-600 truncate">Pending Requests</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/admin/tasks/schedule')}
        >
          <CardBody className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900">{stats.overdueChores}</p>
                <p className="text-xs text-gray-600 truncate">Overdue Chores</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900">{stats.completionRate}%</p>
                <p className="text-xs text-gray-600 truncate">Completion</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Pending Requests Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Pending Requests</h2>
          {pendingRequests.length > 0 && (
            <button
              onClick={() => navigate('/admin/requests')}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </CardHeader>
        <CardBody className="p-0">
          {pendingRequests.length === 0 ? (
            <div className="p-6 text-center">
              <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500 text-sm">No pending requests</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pendingRequests.map((request) => (
                <li
                  key={request.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate('/admin/requests')}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      request.type === 'MAINTENANCE_ISSUE'
                        ? 'bg-red-100'
                        : 'bg-blue-100'
                    }`}>
                      {request.type === 'MAINTENANCE_ISSUE' ? (
                        <Wrench className="w-4 h-4 text-red-600" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 text-sm">
                          {request.tenantName}
                        </p>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(request.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {request.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {request.unitName}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Overdue Chores Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Overdue Chores</h2>
          {overdueChores.length > 0 && (
            <button
              onClick={() => navigate('/admin/tasks/schedule')}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </CardHeader>
        <CardBody className="p-0">
          {overdueChores.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500 text-sm">No overdue chores</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {overdueChores.map((chore) => (
                <li
                  key={chore.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate('/admin/tasks/schedule')}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 text-sm">
                          {chore.occupantName}
                        </p>
                        <span className="text-xs text-amber-600 font-medium">
                          {formatWeekLabel(chore.weekStart)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {chore.choreName}
                      </p>
                      {chore.unitName && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {chore.unitName} {chore.roomNumber && `- Room ${chore.roomNumber}`}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
