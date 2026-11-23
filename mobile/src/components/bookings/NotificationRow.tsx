import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { Small } from '@/components/ui';
import type { AppNotification } from '@/lib/api';
import { starsInBody } from '@/lib/bookings-logic';
import { formatRelative } from '@/lib/format';
import { colors, fonts, radius, space } from '@/theme';

const ICON: Record<AppNotification['type'], IconName> = {
  booking_confirmed: 'ticket',
  booking_received: 'chef',
  order_cancelled: 'close',
  reminder: 'clock',
  message: 'chat',
  review_request: 'star',
  review_received: 'sparkle',
  no_show: 'alert',
  system: 'info',
};

// The headline and detail for a notification, in the reader's language. The server writes English
// titles; they are only used for `system`, which carries its own copy. `body` holds the listing
// title for most types (see private.on_order_notify in migration 0006).
export function notificationCopy(t: TFunction, n: AppNotification): { title: string; body: string | null } {
  const listingTitle = n.body ?? '';
  switch (n.type) {
    case 'booking_confirmed':
      return { title: t('notif.booking_confirmed.title'), body: t('notif.booking_confirmed', { title: listingTitle }) };
    case 'booking_received':
      // body: "<guest name> · <quantity> · <listing title>"
      return { title: t('notif.booking_received.title'), body: n.body };
    case 'order_cancelled':
      if (n.data.status === 'cancelled_by_host') {
        return { title: t('notif.order_cancelled.title'), body: t('notif.order_cancelled.byHost', { title: listingTitle }) };
      }
      if (n.data.status === 'cancelled_by_guest') {
        return { title: t('notif.order_cancelled.title'), body: t('notif.order_cancelled.byGuest', { title: listingTitle }) };
      }
      return { title: t('notif.order_cancelled.title'), body: t('notif.order_cancelled', { title: listingTitle }) };
    case 'no_show':
      return {
        title: t('notif.no_show.title'),
        body: n.data.status === 'no_show_host' ? t('notif.no_show.host', { title: listingTitle }) : t('notif.no_show.guest', { title: listingTitle }),
      };
    case 'reminder':
      return { title: t('notif.reminder.title'), body: t('notif.reminder', { title: listingTitle }) };
    case 'message':
      // title: the sender's name; body: the start of the message.
      return { title: t('notif.message', { name: n.title }), body: n.body };
    case 'review_request':
      return { title: t('notif.review_request.title'), body: t('notif.review_request', { title: listingTitle }) };
    case 'review_received': {
      const stars = starsInBody(n.body);
      return { title: t('notif.review_received.title'), body: stars > 0 ? t('notif.review_received', { count: stars }) : null };
    }
    case 'system':
      return { title: n.title, body: n.body };
  }
}

type Props = { notification: AppNotification; onPress: () => void };

export function NotificationRow({ notification, onPress }: Props) {
  const { t } = useTranslation();
  const { title, body } = notificationCopy(t, notification);
  const isUnread = !notification.read;
  const when = formatRelative(notification.created_at);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[isUnread ? t('inbox.unread') : null, title, body, when].filter(Boolean).join('. ')}
      onPress={onPress}
      style={({ pressed }) => [styles.row, isUnread && styles.rowUnread, pressed && styles.pressed]}>
      <View style={[styles.icon, isUnread && styles.iconUnread]}>
        <Icon name={ICON[notification.type]} size={20} color={isUnread ? colors.amberInk : colors.textMuted} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={2}>
          {title}
        </Text>
        {body ? <Small numberOfLines={2}>{body}</Small> : null}
        <Text style={styles.when}>{when}</Text>
      </View>
      {isUnread ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: 14, paddingHorizontal: space.md, borderRadius: radius.md },
  rowUnread: { backgroundColor: colors.surface },
  pressed: { opacity: 0.6 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  iconUnread: { backgroundColor: colors.amberSoft },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.text },
  titleUnread: { fontFamily: fonts.bodyBold },
  when: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.amberDeep, marginTop: 6 },
});
