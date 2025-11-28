import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { NotificationPanel } from '../notifications/NotificationPanel';

interface MobileLayoutProps {
  children?: ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header
        title="Rentably"
        onNotificationClick={() => setShowNotifications(true)}
      />

      <main className="px-4 py-4">{children || <Outlet />}</main>

      <BottomNav />

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
}
