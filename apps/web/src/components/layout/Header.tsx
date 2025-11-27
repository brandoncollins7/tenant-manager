import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title: string;
  onNotificationClick?: () => void;
}

export function Header({ title, onNotificationClick }: HeaderProps) {
  const { isAuthenticated } = useAuth();

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>

        {isAuthenticated && (
          <button
            onClick={onNotificationClick}
            className="relative p-2 -mr-2 rounded-full hover:bg-gray-100 touch-target"
          >
            <Bell className="w-6 h-6 text-gray-600" />
            {unreadCount && unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
