import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Clock, Hand } from 'lucide-react';
import { choresApi } from '../api/chores';
import { useAuth } from '../context/AuthContext';
import { ChoreCard } from '../components/chores/ChoreCard';
import { CompletionModal } from '../components/chores/CompletionModal';
import { WelcomeModal } from '../components/help/WelcomeModal';
import { Card, CardBody } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { DAYS_OF_WEEK, type ChoreCompletion } from '../types';

const ONBOARDING_KEY = 'rentably_onboarding_completed';

export function DashboardPage() {
  const { user } = useAuth();
  const [selectedCompletion, setSelectedCompletion] =
    useState<ChoreCompletion | null>(null);
  const [showWelcome, setShowWelcome] = useState(
    () => !localStorage.getItem(ONBOARDING_KEY)
  );

  const handleCloseWelcome = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowWelcome(false);
  };

  const { data: todaysChores, isLoading } = useQuery({
    queryKey: ['todaysChores'],
    queryFn: choresApi.getTodaysChores,
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Welcome Card Skeleton */}
        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardBody>
        </Card>
        {/* Status Banner Skeleton */}
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardBody>
        </Card>
        {/* Chore Cards Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  const occupantNames = todaysChores?.occupants.map((o) => o.name).join(' & ') || '';
  const today = new Date().getDay();
  const todayName = DAYS_OF_WEEK[today];

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
              <Hand className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Hi, {user?.occupants?.[0]?.name || 'there'}!
              </h2>
              <p className="text-gray-600">
                Today is <strong>{todayName}</strong>
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
            <h3 className="font-semibold text-gray-900">
              Today's Chores{occupantNames && ` - ${occupantNames}`}
            </h3>
            {todaysChores.chores.map((completion) => (
              <ChoreCard
                key={completion.id}
                completion={completion}
                occupantName={completion.occupant.name}
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
              Enjoy your day off!
            </p>
          </CardBody>
        </Card>
      )}

      {/* Completion Modal */}
      <CompletionModal
        completion={selectedCompletion}
        onClose={() => setSelectedCompletion(null)}
      />

      {/* Welcome Modal (first-time onboarding) */}
      <WelcomeModal isOpen={showWelcome} onClose={handleCloseWelcome} />
    </div>
  );
}
