import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { choresApi } from '../api/chores';
import { useAuth } from '../context/AuthContext';
import { ChoreCard } from '../components/chores/ChoreCard';
import { CompletionModal } from '../components/chores/CompletionModal';
import { Card, CardBody } from '../components/ui/Card';
import { DAYS_OF_WEEK, type ChoreCompletion } from '../types';

export function DashboardPage() {
  const { user, selectedOccupant } = useAuth();
  const [selectedCompletion, setSelectedCompletion] =
    useState<ChoreCompletion | null>(null);

  const { data: todaysChores, isLoading } = useQuery({
    queryKey: ['todaysChores'],
    queryFn: choresApi.getTodaysChores,
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const choreDay = selectedOccupant?.choreDay;
  const dayName = choreDay !== undefined ? DAYS_OF_WEEK[choreDay] : '';

  // Check if all chores are complete
  const allComplete =
    todaysChores?.chores.every((c) => c.status === 'COMPLETED') ?? false;
  const completedCount =
    todaysChores?.chores.filter((c) => c.status === 'COMPLETED').length ?? 0;
  const totalCount = todaysChores?.chores.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👋</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Hi, {selectedOccupant?.name || 'there'}!
              </h2>
              <p className="text-gray-600">
                Your chore day is <strong>{dayName}</strong>
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Today's Status */}
      {todaysChores?.isChoreDay ? (
        <div className="space-y-4">
          {/* Status Banner */}
          <Card
            className={
              allComplete
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }
          >
            <CardBody>
              <div className="flex items-center gap-3">
                {allComplete ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">
                        All done for today!
                      </p>
                      <p className="text-sm text-green-700">
                        Great job completing your chores
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock className="w-6 h-6 text-yellow-600" />
                    <div>
                      <p className="font-semibold text-yellow-800">
                        Today is your chore day!
                      </p>
                      <p className="text-sm text-yellow-700">
                        {completedCount} of {totalCount} chores completed
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Chore List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Today's Chores</h3>
            {todaysChores.chores.map((completion) => (
              <ChoreCard
                key={completion.id}
                completion={completion}
                onComplete={() => setSelectedCompletion(completion)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Not Chore Day */
        <Card>
          <CardBody className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No chores today
            </h3>
            <p className="text-gray-600">
              Your next chore day is <strong>{dayName}</strong>
            </p>
          </CardBody>
        </Card>
      )}

      {/* Completion Modal */}
      <CompletionModal
        completion={selectedCompletion}
        onClose={() => setSelectedCompletion(null)}
      />
    </div>
  );
}
