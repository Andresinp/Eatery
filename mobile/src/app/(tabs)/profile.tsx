import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';

import { InfoRows } from '@/components/account/InfoRows';
import { Icon } from '@/components/icons';
import { Avatar, Button, Card, ErrorState, Gap, Loading, Muted, Row, Screen, Section, Small, Stars, Title, errorMessage } from '@/components/ui';
import { formatMonthYear } from '@/lib/account-format';
import type { MyProfile } from '@/lib/api';
import { logError } from '@/lib/log';
import { unregisterPush } from '@/lib/push';
import { useSession } from '@/lib/session';
import { colors, radius, space } from '@/theme';

export default function ProfileTab() {
  const { state, refreshProfile } = useSession();
  if (state.phase === 'loading') {
    return (
      <Screen scroll={false} edges={['top']}>
        <Loading />
      </Screen>
    );
  }
  if (state.phase === 'signedOut') return <SignedOut />;
  if (!state.profile) {
    return (
      <Screen scroll={false} edges={['top']}>
        <ErrorState error={null} onRetry={() => void refreshProfile()} />
      </Screen>
    );
  }
  return <SignedIn profile={state.profile} />;
}

function SignedOut() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top']}>
      <Title>{t('tabs.profile')}</Title>
      <Gap />
      <Card style={styles.welcomeCard}>
        <View style={styles.welcomeIcon}>
          <Icon name="plate" size={28} color={colors.amberInk} />
        </View>
        <Title style={styles.center}>{t('profile.signedOutTitle')}</Title>
        <Muted style={styles.center}>{t('profile.signedOutBody')}</Muted>
        <Gap size="sm" />
        <Button title={t('profile.signInOrCreate')} onPress={() => router.push('/(auth)/welcome')} style={styles.stretch} />
      </Card>
      <Section label={t('profile.sectionApp')}>
        <View>
          <Row title={t('settings.language')} onPress={() => router.push('/settings/language')} />
          <InfoRows />
        </View>
      </Section>
    </Screen>
  );
}

function SignedIn({ profile }: { profile: MyProfile }) {
  const { t } = useTranslation();
  const { refreshProfile, signOut } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setIsRefreshing(false);
  };

  const doSignOut = async () => {
    setIsSigningOut(true);
    try {
      await unregisterPush();
      await signOut();
    } catch (error) {
      logError('signOut', error);
      Alert.alert(t('errors.title'), errorMessage(error));
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(t('profile.signOutConfirmTitle'), t('profile.signOutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: () => void doSignOut() },
    ]);
  };

  const name = profile.full_name ?? '';

  return (
    <Screen edges={['top']} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void handleRefresh()} tintColor={colors.amberDeep} />}>
      <View style={styles.top}>
        <Avatar uri={profile.avatar_url} name={name} size={96} />
        <Title style={styles.center} numberOfLines={2}>
          {name || t('profile.noName')}
        </Title>
        <Small>{t('profile.memberSince', { date: formatMonthYear(profile.created_at) })}</Small>
        {profile.identity_verified ? (
          <View style={styles.verified}>
            <Icon name="shield" size={14} color={colors.leafInk} />
            <Small style={styles.verifiedText}>{t('listing.verifiedHost')}</Small>
          </View>
        ) : null}
      </View>

      <Gap />
      <View style={styles.ratings}>
        <RatingTile label={t('profile.hostRating')} rating={profile.host_rating} />
        <RatingTile label={t('profile.guestRating')} rating={profile.guest_rating} />
      </View>
      <Gap />
      <Button
        title={t('profile.viewPublic')}
        variant="outline"
        onPress={() => router.push({ pathname: '/user/[id]', params: { id: profile.id } })}
      />

      <Section label={t('profile.sectionAccount')}>
        <View>
          <Row title={t('profile.editProfile')} onPress={() => router.push('/settings/edit-profile')} />
          <Row title={t('settings.title')} onPress={() => router.push('/settings')} />
          <Row title={t('profile.hosting')} onPress={() => router.push('/(tabs)/host')} />
        </View>
      </Section>
      <Section label={t('profile.sectionApp')}>
        <View>
          <InfoRows />
        </View>
      </Section>
      <Gap size="lg" />
      <Button title={t('profile.signOut')} variant="danger" isLoading={isSigningOut} onPress={handleSignOut} />
    </Screen>
  );
}

function RatingTile({ label, rating }: { label: string; rating: number | null }) {
  const { t } = useTranslation();
  return (
    <Card style={styles.ratingTile}>
      <Small>{label}</Small>
      {rating === null ? <Muted>{t('profile.noRatingYet')}</Muted> : <Stars rating={rating} size={18} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  stretch: { alignSelf: 'stretch' },
  welcomeCard: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  welcomeIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  top: { alignItems: 'center', gap: space.xs, paddingTop: space.md },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.leafSoft,
  },
  verifiedText: { color: colors.leafInk },
  ratings: { flexDirection: 'row', gap: space.sm },
  ratingTile: { flex: 1, gap: space.xs },
});
