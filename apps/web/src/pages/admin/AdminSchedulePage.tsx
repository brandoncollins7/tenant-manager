import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiClient } from '../../api/client';
import { DAYS_OF_WEEK } from '../../types';

interface Chore {
  id: string;
  name: string;
  description?: string | null;
}

interface OccupantSchedule {
  id: string;
  name: string;
  roomNumber: string;
  chores: Chore[];
}

interface DaySchedule {
  day: number;
  occupants: OccupantSchedule[];
}

interface Unit {
  id: string;
  name: string;
}

export function AdminSchedulePage() {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  const { data: units } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const response = await apiClient.get('/units');
      return response.data;
    },
  });

  // Auto-select first unit when units load
  useEffect(() => {
    if (units && units.length > 0 && !selectedUnitId) {
      setSelectedUnitId(units[0].id);
    }
  }, [units, selectedUnitId]);

  const { data: scheduleByDay, isLoading } = useQuery<DaySchedule[]>({
    queryKey: ['admin', 'schedule-view', selectedUnitId],
    queryFn: async () => {
      const response = await apiClient.get(`/chores/schedule-view?unitId=${selectedUnitId}`);
      return response.data;
    },
    enabled: !!selectedUnitId,
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-600">View weekly chore assignments</p>
        </div>
        {units && units.length > 0 && (
          <div className="w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Schedule by Day */}
      <div className="space-y-4">
        {scheduleByDay?.map((daySchedule) => {
          const dayName = DAYS_OF_WEEK[daySchedule.day];

          return (
            <Card key={daySchedule.day}>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">{dayName}</h3>
              </CardHeader>
              <CardBody className="p-0">
                {daySchedule.occupants.length === 0 ? (
                  <p className="p-4 text-gray-500 text-sm">No occupants assigned</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {daySchedule.occupants.map((occupant) => (
                      <li
                        key={occupant.id}
                        className="p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-gray-900">
                            {occupant.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Room {occupant.roomNumber}
                          </p>
                        </div>
                        {occupant.chores.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {occupant.chores.map((chore) => (
                              <span
                                key={chore.id}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                              >
                                {chore.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No chores defined</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
