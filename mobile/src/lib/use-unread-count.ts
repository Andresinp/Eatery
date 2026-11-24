import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { api } from '@/lib/api';
import { logError } from '@/lib/log';
import { useNotificationStream } from '@/lib/realtime';
import { useUserId } from '@/lib/session';

// Unread notifications for the signed-in person; 0 when signed out. Refreshes on foreground and
// on every realtime notification.
export function useUnreadCount(): number {
  const userId = useUserId();
  // Tagged with whose count it is, so signing out or switching accounts never shows a stale dot.
  const [count, setCount] = useState<{ userId: string; n: number } | null>(null);
  const refresh = useCallback(() => {
    if (!userId) return;
    api.unreadNotificationCount().then(
      (n) => setCount({ userId, n }),
      (error: unknown) => logError('unreadNotificationCount', error),
    );
  }, [userId]);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);
  useNotificationStream(userId, refresh);
  return userId && count?.userId === userId ? count.n : 0;
}
