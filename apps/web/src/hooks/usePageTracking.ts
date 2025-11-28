import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent, trackPageView } from '../utils/analytics';
import { useAuth } from '../context/AuthContext';
import { normalizeRouteName, extractRouteParams } from '../utils/trackingHelpers';

/**
 * Hook to automatically track page views on route changes
 */
export const usePageTracking = () => {
  const location = useLocation();
  const prevLocationRef = useRef<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = prevLocationRef.current;

    if (previousPath) {
      // Track enhanced navigation event
      trackEvent('navigation', {
        from: previousPath,
        to: currentPath,
        from_route: normalizeRouteName(previousPath),
        to_route: normalizeRouteName(currentPath),
        user_role: user?.isAdmin ? 'admin' : 'tenant',
        ...extractRouteParams(currentPath),
      });
    }

    // Track legacy pageview for Umami's built-in analytics
    trackPageView(currentPath, document.title);

    prevLocationRef.current = currentPath;
  }, [location.pathname, user]);
};
