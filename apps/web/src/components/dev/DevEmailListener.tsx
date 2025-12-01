import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { DevEmailModal } from './DevEmailModal';

interface DevEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  timestamp: string;
}

export function DevEmailListener() {
  const [selectedEmail, setSelectedEmail] = useState<DevEmail | null>(null);

  const showEmailToast = useCallback((email: DevEmail) => {
    toast(
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Mail className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {email.subject}
          </p>
          <p className="text-xs text-gray-500 truncate">
            To: {email.to}
          </p>
        </div>
      </div>,
      {
        duration: 10000,
        action: {
          label: 'View',
          onClick: () => setSelectedEmail(email),
        },
        className: 'dev-email-toast',
      }
    );
  }, []);

  useEffect(() => {
    // Only run in development
    if (!import.meta.env.DEV) return;

    // Use relative URL - Vite proxy will forward to API
    const eventSource = new EventSource('/api/dev/emails/stream');

    eventSource.onmessage = (event) => {
      try {
        const email: DevEmail = JSON.parse(event.data);
        showEmailToast(email);
      } catch (error) {
        console.error('[DevEmailListener] Failed to parse email:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.warn('[DevEmailListener] SSE connection error:', error);
      // Don't spam reconnect attempts - EventSource handles reconnection automatically
    };

    return () => {
      eventSource.close();
    };
  }, [showEmailToast]);

  // Don't render anything in production
  if (!import.meta.env.DEV) return null;

  return (
    <DevEmailModal
      email={selectedEmail}
      onClose={() => setSelectedEmail(null)}
    />
  );
}
