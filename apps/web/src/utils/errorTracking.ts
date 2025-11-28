import { trackEvent } from './analytics';

export function initializeErrorTracking() {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    trackEvent('error:unhandled_promise', {
      reason: event.reason?.message || String(event.reason),
    });
  });

  // Global errors
  window.addEventListener('error', (event) => {
    trackEvent('error:global', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
    });
  });
}
