import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Check, X, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { swapsApi } from '../api/swaps';
import { useAuth } from '../context/AuthContext';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DAYS_OF_WEEK } from '../types';

export function SwapsPage() {
  const { selectedOccupant } = useAuth();
  const queryClient = useQueryClient();

  const { data: swaps, isLoading } = useQuery({
    queryKey: ['swaps', selectedOccupant?.id],
    queryFn: () => swapsApi.getAll(selectedOccupant!.id),
    enabled: !!selectedOccupant,
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      swapsApi.respond(id, approved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swaps'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => swapsApi.cancel(id, selectedOccupant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swaps'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const pendingRequests = swaps?.filter(
    (s) => s.status === 'PENDING' && s.target.id === selectedOccupant?.id
  );
  const myRequests = swaps?.filter(
    (s) => s.requester.id === selectedOccupant?.id
  );
  const pastSwaps = swaps?.filter(
    (s) =>
      s.status !== 'PENDING' &&
      s.target.id === selectedOccupant?.id &&
      s.requester.id !== selectedOccupant?.id
  );

  const statusConfig = {
    PENDING: { badge: 'warning', icon: Clock },
    APPROVED: { badge: 'success', icon: Check },
    REJECTED: { badge: 'danger', icon: X },
    CANCELLED: { badge: 'default', icon: X },
    EXPIRED: { badge: 'default', icon: Clock },
  } as const;

  return (
    <div className="space-y-6">
      {/* Pending Requests (incoming) */}
      {pendingRequests && pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Requests for You</h2>
          {pendingRequests.map((swap) => (
            <Card key={swap.id} className="border-yellow-200 bg-yellow-50">
              <CardBody>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {swap.requester.name} wants to swap
                    </p>
                    <p className="text-sm text-gray-600">
                      Their day ({DAYS_OF_WEEK[swap.requester.choreDay]}) ↔ Your
                      day ({DAYS_OF_WEEK[swap.target.choreDay]})
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      For week: {swap.schedule.weekId}
                    </p>
                    {swap.reason && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        "{swap.reason}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      respondMutation.mutate({ id: swap.id, approved: true })
                    }
                    isLoading={respondMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      respondMutation.mutate({ id: swap.id, approved: false })
                    }
                    isLoading={respondMutation.isPending}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* My Requests (outgoing) */}
      {myRequests && myRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Your Requests</h2>
          {myRequests.map((swap) => {
            const config = statusConfig[swap.status];
            const StatusIcon = config.icon;

            return (
              <Card key={swap.id}>
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          Swap with {swap.target.name}
                        </p>
                        <Badge variant={config.badge} size="sm">
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {swap.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Week: {swap.schedule.weekId}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Requested{' '}
                        {formatDistanceToNow(new Date(swap.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {swap.status === 'PENDING' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => cancelMutation.mutate(swap.id)}
                        isLoading={cancelMutation.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Past Swaps */}
      {pastSwaps && pastSwaps.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Past Requests</h2>
          {pastSwaps.map((swap) => {
            const config = statusConfig[swap.status];
            const StatusIcon = config.icon;

            return (
              <Card key={swap.id} className="opacity-75">
                <CardBody>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-700">
                      {swap.requester.name} → {swap.target.name}
                    </p>
                    <Badge variant={config.badge} size="sm">
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {swap.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {swap.schedule.weekId}
                  </p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {(!swaps || swaps.length === 0) && (
        <Card>
          <CardBody className="text-center py-12">
            <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No swap requests
            </h3>
            <p className="text-gray-600">
              Swap requests will appear here when you or someone else requests a
              day swap.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
