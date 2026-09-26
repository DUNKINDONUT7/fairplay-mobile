import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// Realtime `postgres_changes` subscriptions can silently miss updates (socket
// drops/reconnects, or a table not added to Supabase's realtime publication),
// which showed up as screens displaying stale data until the user manually
// pulled to refresh. This backstops every subscribeTo*() call with a plain
// interval poll and a refetch whenever the app returns to the foreground, so
// a missed realtime event is never stale for more than one poll cycle.
export function useLiveRefresh(onRefresh: () => void, intervalMs = 15000) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const interval = setInterval(() => onRefreshRef.current(), intervalMs);

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') onRefreshRef.current();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [intervalMs]);
}
