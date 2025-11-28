import { createContext, useEffect, type ReactNode } from 'react';
import { trackEvent } from '../utils/analytics';

const AnalyticsContext = createContext({});

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // Find closest element with data-track attribute
      const target = (event.target as HTMLElement).closest('[data-track]');
      if (!target) return;

      const trackingId = target.getAttribute('data-track');
      const trackingPropsStr = target.getAttribute('data-track-props');

      if (!trackingId) return;

      // Determine element type
      const elementType = getElementType(target);

      // Parse additional data if provided
      let additionalData = {};
      if (trackingPropsStr) {
        try {
          additionalData = JSON.parse(trackingPropsStr);
        } catch (e) {
          console.warn('Invalid data-track-props JSON:', trackingPropsStr);
        }
      }

      trackEvent(`click:${elementType}:${trackingId}`, additionalData);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <AnalyticsContext.Provider value={{}}>
      {children}
    </AnalyticsContext.Provider>
  );
}

function getElementType(element: Element): string {
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'button') return 'button';
  if (tagName === 'a') return 'link';
  if (element.getAttribute('role') === 'button') return 'button';
  return 'element';
}
