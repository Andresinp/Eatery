import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatBubble, DaySeparator } from '@/components/bookings/ChatBubble';
import { Icon } from '@/components/icons';
import { Avatar, Empty, ErrorState, errorMessage, Header, IconButton, Loading, Muted, SignInGate, Small } from '@/components/ui';
import { api, ApiError, type Message, type Order } from '@/lib/api';
import { chatItems, mergeMessages, type ChatItem, type ChatMessage } from '@/lib/bookings-logic';
import { confirm, showMenu } from '@/lib/bookings-menu';
import { logError } from '@/lib/log';
import { useMessageStream } from '@/lib/realtime';
import { useSession, useUserId } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { colors, fonts, radius, space } from '@/theme';

const MAX_LENGTH = 2000;

type Person = { id: string; name: string | null; avatar: string | null };
type Loaded = { order: Order; other: Person; messages: Message[] };

export default function ChatScreen() {
  const { t } = useTranslation();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { state } = useSession();
  const userId = useUserId();

  if (state.phase === 'loading' || !userId) {
    return (
      <Shell header={<Header title={t('chat.title')} />}>
        {state.phase === 'loading' ? <Loading /> : <SignInGate />}
      </Shell>
    );
  }
  return <ChatLoader orderId={orderId} userId={userId} />;
}

// The screen's frame: the keyboard-avoiding view is the root so its frame starts at the top of the
// window, which is what KeyboardAvoidingView measures the keyboard against.
function Shell({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]} behavior="padding">
      {header}
      {children}
    </KeyboardAvoidingView>
  );
}

function ChatLoader({ orderId, userId }: { orderId: string; userId: string }) {
  const { t } = useTranslation();
  const data = useAsync(async (): Promise<Loaded | null> => {
    const [order, messages] = await Promise.all([api.order(orderId), api.messages(orderId)]);
    const listing = order?.listing;
    if (!order || !listing) return null;
    let other: Person;
    if (order.guest_id === userId) other = { id: listing.host_id, name: listing.host?.full_name ?? null, avatar: listing.host?.avatar_url ?? null };
    else if (listing.host_id === userId) other = { id: order.guest_id, name: order.guest?.full_name ?? null, avatar: order.guest?.avatar_url ?? null };
    else return null;
    return { order, other, messages };
  }, [orderId, userId]);

  if (data.status === 'ready' && data.data) return <Conversation {...data.data} userId={userId} />;

  return (
    <Shell header={<Header title={t('chat.title')} />}>
      {data.status === 'loading' ? (
        <Loading />
      ) : data.status === 'error' ? (
        <ErrorState error={data.error} onRetry={() => void data.reload()} />
      ) : (
        <Empty icon="chat" title={t('chat.notFoundTitle')} body={t('chat.notFoundBody')} />
      )}
    </Shell>
  );
}

// Whether a send was refused by the database's rules (a block) rather than lost on the way.
function isRefused(error: unknown): boolean {
  return error instanceof ApiError && error.code !== 'network' && /row-level security|violates|permission denied/i.test(error.message);
}

type ConversationProps = Loaded & { userId: string };

function Conversation({ order, other, messages: initial, userId }: ConversationProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>(() => mergeMessages([], initial));
  const [draft, setDraft] = useState('');
  const [closedReason, setClosedReason] = useState<'blocked' | 'cancelled' | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const orderId = order.id;
  const otherName = other.name ?? t('chat.someone');
  const isCancelled = order.status !== 'confirmed' && order.status !== 'completed';

  const markRead = useCallback(() => {
    api.markMessagesRead(orderId).catch((error: unknown) => logError('markMessagesRead', error));
  }, [orderId]);

  useEffect(() => {
    markRead();
  }, [markRead]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setIsKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvent, () => setIsKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleIncoming = useCallback(
    (message: Message) => {
      setMessages((prev) => mergeMessages(prev, [message]));
      if (message.sender_id !== userId) markRead();
    },
    [userId, markRead],
  );
  useMessageStream(orderId, handleIncoming);

  const send = async (localId: string, content: string) => {
    try {
      const sent = await api.sendMessage(orderId, userId, content);
      setMessages((prev) => mergeMessages(prev.filter((m) => m.id !== localId), [sent]));
    } catch (error) {
      logError('sendMessage', error);
      setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, localState: 'failed' } : m)));
      if (isRefused(error)) setClosedReason(isCancelled ? 'cancelled' : 'blocked');
      else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSend = () => {
    const content = draft.trim().slice(0, MAX_LENGTH);
    if (!content) return;
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMessages((prev) =>
      mergeMessages(prev, [
        { id: localId, order_id: orderId, sender_id: userId, content, read: false, created_at: new Date().toISOString(), localState: 'sending' },
      ]),
    );
    setDraft('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void send(localId, content);
  };

  const handleRetry = (message: ChatMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, localState: 'sending' } : m)));
    void send(message.id, message.content);
  };

  const handleBlock = async () => {
    const isSure = await confirm({
      title: t('chat.blockTitle', { name: otherName }),
      message: t('chat.blockBody'),
      confirmLabel: t('common.block'),
      isDestructive: true,
    });
    if (!isSure) return;
    try {
      await api.block(userId, other.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/inbox');
    } catch (error) {
      logError('block', error);
      Alert.alert(t('chat.blockFailed'), errorMessage(error));
    }
  };

  const handleMore = () =>
    showMenu([
      { label: t('common.report'), onPress: () => router.push({ pathname: '/report', params: { userId: other.id, orderId } }) },
      { label: t('common.block'), isDestructive: true, onPress: () => void handleBlock() },
    ]);

  const items = chatItems(messages);
  const safety = (
    <View style={styles.safety}>
      <Icon name="shield" size={16} color={colors.leafInk} />
      <Small style={styles.safetyText}>{t('chat.safety')}</Small>
    </View>
  );

  const header = (
    <View style={styles.header}>
      <Header
        title=""
        right={<IconButton name="more" label={t('chat.more')} onPress={handleMore} />}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('chat.openProfile', { name: otherName })}
        onPress={() => router.push({ pathname: '/user/[id]', params: { id: other.id } })}
        style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
        <Avatar uri={other.avatar} name={other.name} size={34} />
        <View style={styles.personText}>
          <Text style={styles.personName} numberOfLines={1}>
            {otherName}
          </Text>
          <Small numberOfLines={1}>{order.listing?.title ?? ''}</Small>
        </View>
      </Pressable>
    </View>
  );

  const renderItem = ({ item }: { item: ChatItem }) =>
    item.kind === 'day' ? (
      <DaySeparator iso={item.iso} />
    ) : (
      <ChatBubble message={item.message} isMine={item.message.sender_id === userId} canRetry={closedReason === null} onRetry={handleRetry} />
    );

  const bottomPad = isKeyboardOpen ? space.sm : Math.max(insets.bottom, space.sm);

  return (
    <Shell header={header}>
      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          {safety}
          <Empty icon="chat" title={t('chat.emptyTitle', { name: otherName })} body={t('chat.emptyBody')} />
        </View>
      ) : (
        <FlatList
          inverted
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={safety}
        />
      )}
      {closedReason ? (
        <View style={[styles.closed, { paddingBottom: bottomPad }]}>
          <Icon name="info" size={18} color={colors.textMuted} />
          <Muted style={styles.flex}>{closedReason === 'cancelled' ? t('chat.closedCancelled') : t('chat.closedBlocked')}</Muted>
        </View>
      ) : (
        <View style={[styles.composer, { paddingBottom: bottomPad }]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.amberDeep}
            multiline
            maxLength={MAX_LENGTH}
            accessibilityLabel={t('chat.inputLabel')}
          />
          <View style={[styles.sendWrap, !draft.trim() && styles.disabled]}>
            <IconButton name="send" label={t('chat.send')} onPress={handleSend} />
          </View>
        </View>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  person: {
    position: 'absolute',
    left: 56,
    right: 56,
    top: 0,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  personText: { flexShrink: 1 },
  personName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  list: { paddingHorizontal: space.md, paddingVertical: space.sm },
  emptyWrap: { flex: 1, paddingHorizontal: space.md, paddingTop: space.md },
  safety: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    alignSelf: 'center',
    backgroundColor: colors.leafSoft,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginVertical: space.md,
    maxWidth: 420,
  },
  safetyText: { flexShrink: 1, color: colors.leafInk },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
  },
  sendWrap: { backgroundColor: colors.amber, borderRadius: 22 },
  disabled: { opacity: 0.4 },
  closed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
});
