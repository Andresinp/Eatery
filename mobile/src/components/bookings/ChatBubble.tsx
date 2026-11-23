import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import type { ChatMessage } from '@/lib/bookings-logic';
import { formatDay, formatTime } from '@/lib/format';
import { colors, fonts, radius, shadow, space } from '@/theme';

type Props = { message: ChatMessage; isMine: boolean; canRetry: boolean; onRetry: (message: ChatMessage) => void };

export function ChatBubble({ message, isMine, canRetry, onRetry }: Props) {
  const { t } = useTranslation();
  const isFailed = message.localState === 'failed';
  const isSending = message.localState === 'sending';
  const meta = isSending ? t('chat.sending') : isFailed ? (canRetry ? t('chat.failedRetry') : t('chat.failed')) : formatTime(message.created_at);
  const bubble = (
    <View style={[styles.bubble, isMine ? styles.mine : styles.theirs, isFailed && styles.failed]}>
      <Text style={[styles.text, isMine && styles.textMine]} selectable>
        {message.content}
      </Text>
    </View>
  );
  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      {isFailed && canRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('chat.retryLabel')}
          accessibilityHint={message.content}
          onPress={() => onRetry(message)}
          style={({ pressed }) => pressed && styles.pressed}>
          {bubble}
        </Pressable>
      ) : (
        bubble
      )}
      <View style={[styles.metaRow, isMine && styles.metaRowMine]}>
        {isFailed ? <Icon name="alert" size={12} color={colors.danger} /> : null}
        <Text style={[styles.meta, isFailed && styles.metaFailed]}>{meta}</Text>
      </View>
    </View>
  );
}

export function DaySeparator({ iso }: { iso: string }) {
  return (
    <View style={styles.day} accessibilityRole="header">
      <Text style={styles.dayText}>{formatDay(iso)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 3, maxWidth: '82%' },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg },
  mine: { backgroundColor: colors.amber, borderBottomRightRadius: radius.sm / 2 },
  theirs: { backgroundColor: colors.card, borderBottomLeftRadius: radius.sm / 2, ...shadow.card, shadowOpacity: 0.06 },
  failed: { opacity: 0.6 },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.text },
  textMine: { color: colors.amberInk },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, paddingHorizontal: 4 },
  metaRowMine: { justifyContent: 'flex-end' },
  meta: { fontFamily: fonts.body, fontSize: 11, color: colors.textFaint },
  metaFailed: { color: colors.danger },
  pressed: { opacity: 0.6 },
  day: { alignSelf: 'center', marginVertical: space.md, paddingHorizontal: space.md, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.surface },
  dayText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textMuted },
});
