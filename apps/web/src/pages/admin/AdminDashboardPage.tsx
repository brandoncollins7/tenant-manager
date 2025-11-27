import { useQuery } from '@tanstack/react-query';
import { Users, Home, Calendar, CheckCircle2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiClient } from '../../api/client';

interface DashboardStats {
  totalTenants: number;
  totalOccupants: number;
  totalRooms: number;
  completionRate: number;
}

export function AdminDashboardPage() {
  const { data: tenants } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: async () => {
      const response = await apiClient.get('/tenants');
      return response.data;
    },
  });

  const stats: DashboardStats = {
    totalTenants: tenants?.length ?? 0,
    totalOccupants: tenants?.reduce((acc: number, t: { occupants: unknown[] }) => acc + (t.occupants?.length ?? 0), 0) ?? 0,
    totalRooms: new Set(tenants?.map((t: { roomId: string }) => t.roomId)).size ?? 0,
    completionRate: 0, // TODO: Calculate from actual data
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Manage tenants, occupants, and chore schedules</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTenants}</p>
              <p className="text-sm text-gray-600">Tenants</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOccupants}</p>
              <p className="text-sm text-gray-600">Occupants</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Home className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRooms}</p>
              <p className="text-sm text-gray-600">Rooms</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
              <p className="text-sm text-gray-600">Completion</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Tenants */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Tenants</h2>
        </CardHeader>
        <CardBody className="p-0">
          {tenants?.length === 0 ? (
            <p className="p-4 text-gray-600 text-center">No tenants yet</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tenants?.map((tenant: { id: string; email: string; room?: { roomNumber: string }; occupants?: { id: string; name: string }[] }) => (
                <li key={tenant.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{tenant.email}</p>
                      <p className="text-sm text-gray-600">
                        Room {tenant.room?.roomNumber ?? 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {tenant.occupants?.length ?? 0} occupant(s)
                      </p>
                      <p className="text-xs text-gray-500">
                        {tenant.occupants?.map((o: { name: string }) => o.name).join(', ')}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Quick Actions</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          <a
            href="/admin/tenants"
            className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Manage Tenants</span>
            </div>
          </a>
          <a
            href="/admin/schedule"
            className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">View Schedule</span>
            </div>
          </a>
        </CardBody>
      </Card>
    </div>
  );
}
