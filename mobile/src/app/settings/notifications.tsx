import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState, Linking, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Body, Button, Card, ErrorState, Header, Loading, Screen, Section, SignInGate, ToggleRow, errorMessage } from '@/components/ui';
import { api, type MyProfile, type NotificationPrefs } from '@/lib/api';
import { logError } from '@/lib/log';
import { registerForPush } from '@/lib/push';
import { useSession } from '@/lib/session';
import { colors, space } from '@/theme';

type Permission = 'granted' | 'undetermined' | 'denied';

export default function NotificationSettings() {
  const { t } = useTranslation();
  const { state, refreshProfile } = useSession();
  const header = <Header title={t('settings.notifications')} />;
  if (state.phase === 'loading') {
    return (
      <Screen scroll={false} header={header}>
        <Loading />
      </Screen>
    );
  }
  if (state.phase === 'signedOut') {
    return (
      <Screen scroll={false} header={header}>
        <SignInGate />
      </Screen>
    );
  }
  if (!state.profile) {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState error={null} onRetry={() => void refreshProfile()} />
      </Screen>
    );
  }
  return <PrefsForm key={state.profile.id} profile={state.profile} header={header} />;
}

function usePermission(): { permission: Permission | null; recheck: () => void } {
  const [permission, setPermission] = useState<Permission | null>(null);
  const recheck = useCallback(() => {
    Notifications.getPermissionsAsync().then(
      (result) => setPermission(result.granted ? 'granted' : result.canAskAgain ? 'undetermined' : 'denied'),
      (error: unknown) => logError('getPermissionsAsync', error),
    );
  }, []);
  useEffect(() => {
    recheck();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && recheck());
    return () => sub.remove();
  }, [recheck]);
  return { permission, recheck };
}

const PREF_KEYS = ['bookings', 'reminders', 'messages', 'reviews', 'marketing'] as const satisfies readonly (keyof NotificationPrefs)[];

function PrefsForm({ profile, header }: { profile: MyProfile; header: React.ReactNode }) {
  const { t } = useTranslation();
  const { refreshProfile } = useSession();
  const [prefs, setPrefs] = useState<NotificationPrefs>(profile.notification_prefs);
  const { permission, recheck } = usePermission();
  const [isAsking, setIsAsking] = useState(false);

  const labels: Record<keyof NotificationPrefs, { title: string; help: string }> = {
    bookings: { title: t('settings.notifBookings'), help: t('settings.notifBookingsHelp') },
    reminders: { title: t('settings.notifReminders'), help: t('settings.notifRemindersHelp') },
    messages: { title: t('settings.notifMessages'), help: t('settings.notifMessagesHelp') },
    reviews: { title: t('settings.notifReviews'), help: t('settings.notifReviewsHelp') },
    marketing: { title: t('settings.notifMarketing'), help: t('settings.notifMarketingHelp') },
  };

  const handleToggle = async (key: keyof NotificationPrefs, value: boolean) => {
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      await api.updateMyProfile(profile.id, { notification_prefs: next });
      await refreshProfile();
    } catch (error) {
      logError('save notification_prefs', error);
      setPrefs(previous);
      Alert.alert(t('errors.title'), errorMessage(error));
    }
  };

  const handleTurnOn = async () => {
    if (permission === 'denied') {
      Linking.openSettings().catch((error: unknown) => logError('openSettings', error));
      return;
    }
    setIsAsking(true);
    try {
      await registerForPush();
    } catch (error) {
      logError('registerForPush (settings)', error);
      Alert.alert(t('errors.title'), errorMessage(error));
    } finally {
      setIsAsking(false);
      recheck();
    }
  };

  return (
    <Screen header={header}>
      {permission !== null && permission !== 'granted' ? (
        <Card style={styles.banner}>
          <View style={styles.bannerTop}>
            <Icon name="bell" size={22} color={colors.amberDeep} />
            <Body style={styles.bannerText}>{permission === 'denied' ? t('settings.notifOffDenied') : t('settings.notifOffAsk')}</Body>
          </View>
          <Button
            title={permission === 'denied' ? t('errors.openSettings') : t('settings.notifTurnOn')}
            isLoading={isAsking}
            onPress={() => void handleTurnOn()}
          />
        </Card>
      ) : null}
      <Section label={t('settings.notifWhat')}>
        <View>
          {PREF_KEYS.map((key) => (
            <ToggleRow key={key} title={labels[key].title} help={labels[key].help} value={prefs[key]} onChange={(v) => void handleToggle(key, v)} />
          ))}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { gap: space.md, backgroundColor: colors.amberSoft },
  bannerTop: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  bannerText: { flex: 1 },
});
