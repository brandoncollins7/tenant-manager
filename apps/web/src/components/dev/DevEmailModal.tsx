import { X, Mail } from 'lucide-react';

interface DevEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  timestamp: string;
}

interface DevEmailModalProps {
  email: DevEmail | null;
  onClose: () => void;
}

export function DevEmailModal({ email, onClose }: DevEmailModalProps) {
  if (!email) return null;

  const formattedTime = new Date(email.timestamp).toLocaleTimeString();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 z-[100] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Dev Email Preview</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-amber-100"
            >
              <X className="w-5 h-5 text-amber-600" />
            </button>
          </div>

          {/* Email metadata */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-sm space-y-1">
            <div className="flex">
              <span className="w-16 text-gray-500">From:</span>
              <span className="text-gray-900">{email.from}</span>
            </div>
            <div className="flex">
              <span className="w-16 text-gray-500">To:</span>
              <span className="text-gray-900">{email.to}</span>
            </div>
            <div className="flex">
              <span className="w-16 text-gray-500">Subject:</span>
              <span className="text-gray-900 font-medium">{email.subject}</span>
            </div>
            <div className="flex">
              <span className="w-16 text-gray-500">Time:</span>
              <span className="text-gray-900">{formattedTime}</span>
            </div>
          </div>

          {/* Email content iframe */}
          <div className="flex-1 overflow-auto bg-white">
            <iframe
              srcDoc={`<base target="_blank">${email.html}`}
              title="Email preview"
              className="w-full h-full min-h-[400px] border-0"
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        </div>
      </div>
    </>
  );
}
