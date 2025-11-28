import type { UmamiEventData } from '../types/umami';

/**
 * Check if Umami analytics is available
 */
export const isUmamiAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.umami;
};

/**
 * Track a custom event
 */
export const trackEvent = (eventName: string, eventData?: UmamiEventData): void => {
  if (isUmamiAvailable()) {
    window.umami!.track(eventName, eventData);
  } else if (import.meta.env.DEV) {
    console.log('[Analytics]', eventName, eventData);
  }
};

/**
 * Identify the current user
 */
export const identifyUser = (userId: string, userData?: Record<string, any>): void => {
  if (isUmamiAvailable()) {
    window.umami!.identify({ userId, ...userData });
  }
};

/**
 * Track page view (manual tracking for SPAs)
 */
export const trackPageView = (path: string, title?: string): void => {
  if (isUmamiAvailable()) {
    window.umami!.track('pageview', { path, title });
  }
};

/**
 * Helper to add data-track attributes for click tracking
 */
export function trackClick(id: string, props?: Record<string, any>) {
  return {
    'data-track': id,
    ...(props && { 'data-track-props': JSON.stringify(props) }),
  };
}

// Event names constants for consistency
export const EVENTS = {
  // Chore events
  CHORE_COMPLETED: 'chore-completed',
  CHORE_COMPLETION_STARTED: 'chore-completion-started',
  CHORE_COMPLETION_CANCELLED: 'chore-completion-cancelled',

  // Swap events
  SWAP_REQUESTED: 'swap-requested',
  SWAP_APPROVED: 'swap-approved',
  SWAP_REJECTED: 'swap-rejected',
  SWAP_CANCELLED: 'swap-cancelled',

  // Auth events
  USER_LOGGED_IN: 'user-logged-in',
  USER_LOGGED_OUT: 'user-logged-out',
  OCCUPANT_SWITCHED: 'occupant-switched',
} as const;
