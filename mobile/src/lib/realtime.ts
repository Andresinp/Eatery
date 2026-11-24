import { useEffect } from 'react';

import type { Message } from './api';
import { logError } from './log';
import { supabase } from './supabase';

// supabase.channel(name) hands back the EXISTING channel when one with that name is still open,
// and adding .on() to an already-subscribed channel throws. That crashed the app on sign-in
// (build 2): a remounted screen subscribed again before removeChannel() of the old one had
// finished. Every subscription therefore gets its own channel name; the filter, not the name,
// decides which rows arrive.
let channelSeq = 0;
const uniqueChannel = (name: string) => supabase.channel(`${name}:${++channelSeq}`);

// New messages in one conversation, live. RLS on `messages` applies to Realtime too, so only the
// guest and the host receive them.
export function useMessageStream(orderId: string, onMessage: (message: Message) => void): void {
  useEffect(() => {
    const channel = uniqueChannel(`messages:${orderId}`)
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
    const channel = uniqueChannel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => onChange())
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') logError(`notifications:${userId}`, error ?? status);
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, onChange]);
}
