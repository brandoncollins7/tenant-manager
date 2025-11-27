import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useState } from 'react';
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
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
  return monday.toISOString().split('T')[0];
}

export function AdminSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekId = getWeekId(currentDate);

  const { data: schedule, isLoading } = useQuery<WeekSchedule>({
    queryKey: ['admin', 'schedule', weekId],
    queryFn: async () => {
      const response = await apiClient.get(`/chores/schedule/${weekId}`);
      return response.data;
    },
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-gray-600">View and manage chore schedules</p>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <p className="font-semibold text-gray-900">Week of {weekId}</p>
              <button
                onClick={goToCurrentWeek}
                className="text-sm text-primary-600 hover:underline"
              >
                Go to current week
              </button>
            </div>
            <Button variant="outline" onClick={goToNextWeek}>
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
