import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Check, Clock } from 'lucide-react';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { choresApi } from '../api/chores';
import { useAuth } from '../context/AuthContext';
import { AnimatedList, FadeIn } from '../components/ui/AnimatedList';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { CompletionModal } from '../components/chores/CompletionModal';
import { DAYS_OF_WEEK, type ChoreCompletion } from '../types';

function getWeekId(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);

  const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

  return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

export function ChoresPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCompletion, setSelectedCompletion] = useState<ChoreCompletion | null>(null);
  const weekId = getWeekId(currentDate);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const unitId = user?.room?.unit?.id;

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedule', weekId, unitId],
    queryFn: () => choresApi.getScheduleByWeek(weekId, unitId),
    enabled: !!user && !!unitId,
  });

  const handlePrevWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  // Group completions by occupant
  const completionsByOccupant = schedule?.completions.reduce(
    (acc, completion) => {
      const key = completion.occupant.id;
      if (!acc[key]) {
        acc[key] = {
          occupant: completion.occupant,
          completions: [],
        };
      }
      acc[key].completions.push(completion);
      return acc;
    },
    {} as Record<
      string,
      { occupant: typeof schedule.completions[0]['occupant']; completions: typeof schedule.completions }
    >
  );

  return (
    <FadeIn>
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevWeek}
              className="p-2 rounded-full hover:bg-gray-100 touch-target"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="font-semibold text-gray-900">
                Week of {format(weekStart, 'MMM d, yyyy')}
              </p>
              <p className="text-sm text-gray-500">{weekId}</p>
            </div>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-full hover:bg-gray-100 touch-target"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Schedule */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : !schedule || !completionsByOccupant ? (
        <Card>
          <CardBody className="text-center py-8 text-gray-500">
            No schedule for this week
          </CardBody>
        </Card>
      ) : (
        <AnimatedList className="space-y-4">
          {Object.values(completionsByOccupant).map(({ occupant, completions }) => {
            const completedCount = completions.filter(
              (c) => c.status === 'COMPLETED'
            ).length;
            const allComplete = completedCount === completions.length;

            return (
              <Card key={occupant.id}>
                <CardBody>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {occupant.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {DAYS_OF_WEEK[occupant.choreDay]}
                      </p>
                    </div>
                    <Badge variant={allComplete ? 'success' : 'warning'}>
                      {completedCount}/{completions.length}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {completions.map((completion) => {
                      const isOwnChore = user?.occupants?.some(
                        (o) => o.id === completion.occupant.id
                      );
                      const canComplete = isOwnChore && completion.status === 'PENDING';

                      return (
                        <div
                          key={completion.id}
                          className="py-2 border-t border-gray-100"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>{completion.chore.icon || '📋'}</span>
                              <span className="text-sm">{completion.chore.name}</span>
                            </div>
                            <Badge
                              size="sm"
                              variant={
                                completion.status === 'COMPLETED'
                                  ? 'success'
                                  : completion.status === 'MISSED'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {completion.status}
                            </Badge>
                          </div>

                          {canComplete && (
                            <button
                              onClick={() => setSelectedCompletion(completion as ChoreCompletion)}
                              className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 active:bg-green-800"
                            >
                              <Check className="w-4 h-4" />
                              Mark Complete
                            </button>
                          )}

                          {completion.status === 'COMPLETED' && completion.completedAt && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                              <Check className="w-3 h-3" />
                              <span>
                                Completed{' '}
                                {new Date(completion.completedAt).toLocaleTimeString([], {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          )}

                          {completion.status === 'MISSED' && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                              <Clock className="w-3 h-3" />
                              <span>Not completed</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </AnimatedList>
      )}

      {/* Completion Modal */}
      <CompletionModal
        completion={selectedCompletion}
        onClose={() => setSelectedCompletion(null)}
      />
    </div>
    </FadeIn>
  );
}
