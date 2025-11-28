import { Check, Camera, Clock } from 'lucide-react';
import { Card, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { ChoreCompletion } from '../../types';

interface ChoreCardProps {
  completion: ChoreCompletion;
  occupantName?: string;
  onComplete: () => void;
}

export function ChoreCard({ completion, occupantName, onComplete }: ChoreCardProps) {
  const { chore, status, completedAt } = completion;

  const statusConfig = {
    PENDING: { badge: 'warning', label: 'Pending' },
    COMPLETED: { badge: 'success', label: 'Done' },
    MISSED: { badge: 'danger', label: 'Missed' },
    EXCUSED: { badge: 'info', label: 'Excused' },
  } as const;

  const config = statusConfig[status];

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{chore.icon || '📋'}</span>
            <div>
              <h3 className="font-semibold text-gray-900">
                {chore.name}
                {occupantName && (
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    ({occupantName})
                  </span>
                )}
              </h3>
              {chore.description && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {chore.description}
                </p>
              )}
            </div>
          </div>
          <Badge variant={config.badge}>{config.label}</Badge>
        </div>

        {status === 'PENDING' && (
          <button
            onClick={onComplete}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 active:bg-green-800 touch-target"
          >
            <Check className="w-5 h-5" />
            Mark Complete
          </button>
        )}

        {status === 'COMPLETED' && completedAt && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
            <Check className="w-4 h-4" />
            <span>
              Completed{' '}
              {new Date(completedAt).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {status === 'MISSED' && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
            <Clock className="w-4 h-4" />
            <span>This chore was not completed</span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
