import { useQuery } from '@tanstack/react-query';
import { LogOut, User, Calendar, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DAYS_OF_WEEK } from '../types';
import { apiClient } from '../api/client';

export function ProfilePage() {
  const { user, selectedOccupant, selectOccupant, logout } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['stats', 'occupant', selectedOccupant?.id],
    queryFn: async () => {
      const response = await apiClient.get(
        `/stats/occupant/${selectedOccupant?.id}`
      );
      return response.data;
    },
    enabled: !!selectedOccupant,
  });

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedOccupant?.name || 'Guest'}
              </h2>
              <p className="text-gray-600">{user?.email}</p>
              {user?.room && (
                <p className="text-sm text-gray-500">{user.room.roomNumber}</p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Occupant Selector (if multiple) */}
      {user?.occupants && user.occupants.length > 1 && (
        <Card>
          <CardBody>
            <h3 className="font-semibold text-gray-900 mb-3">Switch Person</h3>
            <div className="space-y-2">
              {user.occupants.map((occupant) => (
                <button
                  key={occupant.id}
                  onClick={() => selectOccupant(occupant)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedOccupant?.id === occupant.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{occupant.name}</p>
                      <p className="text-sm text-gray-500">
                        {DAYS_OF_WEEK[occupant.choreDay]}
                      </p>
                    </div>
                  </div>
                  {selectedOccupant?.id === occupant.id && (
                    <Badge variant="info">Active</Badge>
                  )}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Chore Day */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Your Chore Day</p>
              <p className="font-semibold text-gray-900">
                {selectedOccupant
                  ? DAYS_OF_WEEK[selectedOccupant.choreDay]
                  : '-'}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Stats */}
      {stats && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Your Stats</p>
                <p className="text-sm text-gray-500">Chore completion rate</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.missed}</p>
                <p className="text-xs text-gray-500">Missed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-600">
                  {stats.completionRate}%
                </p>
                <p className="text-xs text-gray-500">Rate</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Logout */}
      <Button variant="secondary" className="w-full" onClick={logout}>
        <LogOut className="w-5 h-5 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
