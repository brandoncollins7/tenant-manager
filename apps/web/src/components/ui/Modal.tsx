import { type ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { trackEvent } from '../../utils/analytics';
import { deriveModalId } from '../../utils/trackingHelpers';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  trackingId?: string;
}

export function Modal({ isOpen, onClose, title, children, trackingId }: ModalProps) {
  const modalId = trackingId || deriveModalId(title);
  const openedAtRef = useRef<number>(0);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Modal tracking
  useEffect(() => {
    if (isOpen) {
      openedAtRef.current = Date.now();
      trackEvent(`modal:open:${modalId}`, { title });
    } else if (openedAtRef.current > 0) {
      const duration = Date.now() - openedAtRef.current;
      trackEvent(`modal:close:${modalId}`, {
        title,
        duration_ms: duration,
      });
      openedAtRef.current = 0;
    }
  }, [isOpen, modalId, title]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        style={{ margin: 0 }}
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-6 pointer-events-none">
        {/* Modal */}
        <div className="pointer-events-auto relative w-full sm:max-w-lg bg-white sm:rounded-2xl h-auto sm:max-h-[90vh] overflow-hidden shadow-xl self-end sm:self-center">
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full hover:bg-gray-100 touch-target"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-60px)] px-6 py-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
