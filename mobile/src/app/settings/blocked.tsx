import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, RefreshControl, View } from 'react-native';

import { Avatar, Button, Empty, ErrorState, Header, Loading, Muted, Row, Screen, SignInGate, errorMessage } from '@/components/ui';
import { api } from '@/lib/api';
import { logError } from '@/lib/log';
import { useUserId } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { colors } from '@/theme';

export default function BlockedPeople() {
  const { t } = useTranslation();
  const userId = useUserId();
  const header = <Header title={t('settings.blocked')} />;
  if (!userId) {
    return (
      <Screen scroll={false} header={header}>
        <SignInGate />
      </Screen>
    );
  }
  return <BlockedList userId={userId} header={header} />;
}

function BlockedList({ userId, header }: { userId: string; header: React.ReactNode }) {
  const { t } = useTranslation();
  const people = useAsync(() => api.blockedPeople(userId), [userId]);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const doUnblock = async (id: string) => {
    setUnblockingId(id);
    try {
      await api.unblock(userId, id);
      await people.reload();
    } catch (error) {
      logError('unblock', error);
      Alert.alert(t('errors.title'), errorMessage(error));
    } finally {
      setUnblockingId(null);
    }
  };

  const handleUnblock = (id: string, name: string) => {
    Alert.alert(t('settings.unblockConfirmTitle', { name }), t('settings.unblockConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.unblock'), onPress: () => void doUnblock(id) },
    ]);
  };

  if (people.status === 'loading') {
    return (
      <Screen scroll={false} header={header}>
        <Loading />
      </Screen>
    );
  }
  if (people.status === 'error') {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState error={people.error} onRetry={() => void people.reload()} />
      </Screen>
    );
  }
  if (people.data.length === 0) {
    return (
      <Screen scroll={false} header={header}>
        <Empty icon="shield" title={t('settings.blockedEmptyTitle')} body={t('settings.blockedEmptyBody')} />
      </Screen>
    );
  }
  return (
    <Screen
      header={header}
      refreshControl={<RefreshControl refreshing={people.isRefreshing} onRefresh={() => void people.reload()} tintColor={colors.amberDeep} />}>
      <Muted>{t('settings.blockedIntro')}</Muted>
      <View>
        {people.data.map((person) => {
          const name = person.full_name ?? t('user.someone');
          return (
            <Row
              key={person.id}
              title={name}
              left={<Avatar uri={person.avatar_url} name={name} size={40} />}
              right={
                <Button
                  title={t('settings.unblock')}
                  variant="outline"
                  isLoading={unblockingId === person.id}
                  onPress={() => handleUnblock(person.id, name)}
                  style={{ minHeight: 40, paddingHorizontal: 16 }}
                />
              }
            />
          );
        })}
      </View>
    </Screen>
  );
}
