import { useEffect } from 'react';

import type { Message } from './api';
import { logError } from './log';
import { supabase } from './supabase';

// New messages in one conversation, live. RLS on `messages` applies to Realtime too, so only the
// guest and the host receive them.
export function useMessageStream(orderId: string, onMessage: (message: Message) => void): void {
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${orderId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` }, (payload) =>
        onMessage(payload.new as Message),
      )
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') logError(`messages:${orderId}`, error ?? status);
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, onMessage]);
}

// Any new notification for me: refresh the inbox badge.
export function useNotificationStream(userId: string | null, onChange: () => void): void {
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => onChange())
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') logError(`notifications:${userId}`, error ?? status);
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, onChange]);
}
