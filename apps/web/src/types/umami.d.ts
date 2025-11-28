export interface UmamiEventData {
  [key: string]: string | number | boolean | undefined;
}

export interface UmamiTracker {
  track: (eventName: string, eventData?: UmamiEventData) => void;
  identify: (userData: { userId?: string; [key: string]: any }) => void;
}

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

export {};
