import React from 'react';
import ReactDOM from 'react-dom/client';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { AnalyticsProvider } from './context/AnalyticsProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializeErrorTracking } from './utils/errorTracking';
import { trackEvent } from './utils/analytics';
import { sanitizeMutationVariables, getCurrentUserRole } from './utils/trackingHelpers';
import App from './App';
import './styles/globals.css';

// Initialize global error tracking
initializeErrorTracking();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
  mutationCache: new MutationCache({
    onSuccess: (_data, variables, _context, mutation) => {
      if (mutation.options.meta?.skipTracking) return;

      const mutationKey = mutation.options.mutationKey;
      if (!mutationKey) return;

      trackEvent(`mutation:${mutationKey.join('_')}`, {
        success: true,
        user_role: getCurrentUserRole(),
        ...sanitizeMutationVariables(variables),
      });
    },

    onError: (error, _variables, _context, mutation) => {
      if (mutation.options.meta?.skipTracking) return;

      const mutationKey = mutation.options.mutationKey;
      if (!mutationKey) return;

      trackEvent(`mutation:${mutationKey.join('_')}_error`, {
        success: false,
        error_type: error.name,
        error_message: error.message?.substring(0, 100),
      });
    },
  }),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AnalyticsProvider>
          <AuthProvider>
            <App />
            <Toaster
              position="top-center"
              expand={false}
              richColors
              closeButton
              duration={4000}
            />
          </AuthProvider>
        </AnalyticsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
