import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../api/client';
import { DAYS_OF_WEEK } from '../../types';

interface ChoreCompletion {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'MISSED' | 'EXCUSED';
  completedAt?: string;
  chore: {
    name: string;
  };
  occupant: {
    name: string;
    choreDay: number;
    tenant: {
      room: {
        roomNumber: string;
      };
    };
  };
}

interface WeekSchedule {
  id: string;
  weekId: string;
  weekStart: string;
  completions: ChoreCompletion[];
}

function getWeekId(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Get to Monday
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);

  // Get week number
  const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

  return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

interface Unit {
  id: string;
  name: string;
}

export function AdminSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const weekId = getWeekId(currentDate);
  const weekStart = getWeekStart(currentDate);

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

  const { data: schedule, isLoading } = useQuery<WeekSchedule>({
    queryKey: ['admin', 'schedule', weekId, selectedUnitId],
    queryFn: async () => {
      const response = await apiClient.get(`/chores/schedule/${weekId}?unitId=${selectedUnitId}`);
      return response.data;
    },
    enabled: !!selectedUnitId,
  });

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  // Group completions by day
  const completionsByDay = schedule?.completions.reduce((acc, completion) => {
    const day = completion.occupant.choreDay;
    if (!acc[day]) acc[day] = [];
    acc[day].push(completion);
    return acc;
  }, {} as Record<number, ChoreCompletion[]>) ?? {};

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'MISSED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

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
          <p className="text-gray-600">View and manage chore schedules</p>
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

      {/* Week Navigation */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <p className="font-semibold text-gray-900">Week of {weekStart}</p>
              <button
                onClick={goToCurrentWeek}
                className="text-sm text-primary-600 hover:underline"
              >
                Go to current week
              </button>
            </div>
            <Button variant="secondary" onClick={goToNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Schedule by Day */}
      <div className="space-y-4">
        {DAYS_OF_WEEK.map((dayName, dayIndex) => {
          const dayCompletions = completionsByDay[dayIndex] ?? [];

          return (
            <Card key={dayIndex}>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">{dayName}</h3>
              </CardHeader>
              <CardBody className="p-0">
                {dayCompletions.length === 0 ? (
                  <p className="p-4 text-gray-500 text-sm">No chores scheduled</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {dayCompletions.map((completion) => (
                      <li
                        key={completion.id}
                        className="p-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {completion.occupant.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Room {completion.occupant.tenant?.room?.roomNumber ?? 'N/A'} - {completion.chore.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(completion.status)}
                          <span className="text-sm text-gray-600 capitalize">
                            {completion.status.toLowerCase()}
                          </span>
                        </div>
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
