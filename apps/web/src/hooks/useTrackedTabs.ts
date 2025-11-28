import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { trackEvent } from '../utils/analytics';

export function useTrackedTabs<T extends string>(
  tabKey: string,
  defaultTab: T,
  trackingContext: string
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get(tabKey) as T) || defaultTab;
  const prevTabRef = useRef(currentTab);

  const setTab = (newTab: T) => {
    if (newTab !== prevTabRef.current) {
      trackEvent('tab:switch', {
        context: trackingContext,
        from: prevTabRef.current,
        to: newTab,
      });
      prevTabRef.current = newTab;
    }

    setSearchParams({ [tabKey]: newTab });
  };

  return [currentTab, setTab] as const;
}
