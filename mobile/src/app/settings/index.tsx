import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { DeleteAccountSheet } from '@/components/account/DeleteAccountSheet';
import { Header, Loading, Row, Screen, Section, SignInGate } from '@/components/ui';
import { LANGUAGE_NAMES } from '@/i18n';
import { isSupported } from '@/lib/language';
import { useSession } from '@/lib/session';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { state } = useSession();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  if (state.phase === 'loading') {
    return (
      <Screen scroll={false} header={<Header title={t('settings.title')} />}>
        <Loading />
      </Screen>
    );
  }
  if (state.phase === 'signedOut') {
    return (
      <Screen scroll={false} header={<Header title={t('settings.title')} />}>
        <SignInGate />
      </Screen>
    );
  }

  const email = state.profile?.email ?? state.session.user.email ?? '';
  const languageName = isSupported(i18n.language) ? LANGUAGE_NAMES[i18n.language] : i18n.language;

  return (
    <Screen header={<Header title={t('settings.title')} />}>
      <Section label={t('settings.account')}>
        <View>
          <Row title={t('settings.email')} subtitle={email || t('settings.noEmail')} />
          <Row title={t('profile.editProfile')} onPress={() => router.push('/settings/edit-profile')} />
        </View>
      </Section>
      <Section label={t('settings.preferences')}>
        <View>
          <Row title={t('settings.notifications')} onPress={() => router.push('/settings/notifications')} />
          <Row title={t('settings.language')} subtitle={languageName} onPress={() => router.push('/settings/language')} />
          <Row title={t('settings.blocked')} onPress={() => router.push('/settings/blocked')} />
        </View>
      </Section>
      <Section label={t('settings.dangerZone')}>
        <View>
          <Row title={t('settings.deleteAccount')} tone="danger" onPress={() => setIsDeleteOpen(true)} />
        </View>
      </Section>
      <DeleteAccountSheet isVisible={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} />
    </Screen>
  );
}
