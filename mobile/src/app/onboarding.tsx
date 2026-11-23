import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { AvatarEditor } from '@/components/account/AvatarEditor';
import { TagChips } from '@/components/account/TagChips';
import { Icon } from '@/components/icons';
import { Body, Button, Field, Gap, Loading, Muted, Screen, Small, Title, errorMessage } from '@/components/ui';
import { i18n } from '@/i18n';
import { api, type MyProfile } from '@/lib/api';
import { logError } from '@/lib/log';
import { registerForPush } from '@/lib/push';
import { useSession } from '@/lib/session';
import { ALLERGENS, DIETARY } from '@/lib/vocab';
import { colors, radius, space } from '@/theme';

const STEPS = ['name', 'dietary', 'allergens', 'notifications'] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const { state } = useSession();
  if (state.phase === 'loading') return <Loading />;
  if (state.phase === 'signedOut') return <Redirect href="/" />;
  return <OnboardingFlow userId={state.session.user.id} profile={state.profile} />;
}

type Props = { userId: string; profile: MyProfile | null };

function OnboardingFlow({ userId, profile }: Props) {
  const { t } = useTranslation();
  const { refreshProfile } = useSession();
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [dietary, setDietary] = useState<string[]>(profile?.dietary_prefs ?? []);
  const [allergens, setAllergens] = useState<string[]>(profile?.allergen_exclusions ?? []);
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'push' | 'finish' | null>(null);

  const step: Step = STEPS[stepIndex] ?? 'name';
  const isLast = stepIndex === STEPS.length - 1;

  const finish = async () => {
    setBusy('finish');
    try {
      await api.updateMyProfile(userId, {
        full_name: name.trim(),
        avatar_url: avatarUrl,
        dietary_prefs: dietary,
        allergen_exclusions: allergens,
        language: i18n.language,
        onboarded: true,
      });
      await refreshProfile();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/explore');
    } catch (error) {
      logError('onboarding finish', error);
      Alert.alert(t('errors.title'), errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const handleNext = () => {
    if (step === 'name' && name.trim().length === 0) {
      setNameError(t('onboarding.nameRequired'));
      return;
    }
    setNameError(null);
    if (isLast) void finish();
    else setStepIndex((i) => i + 1);
  };

  const handleBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const handleTurnOnPush = async () => {
    setBusy('push');
    try {
      await registerForPush();
    } catch (error) {
      // Push is a nice-to-have: a failure here must not block finishing setup.
      logError('registerForPush (onboarding)', error);
    }
    await finish();
  };

  const footer =
    step === 'notifications' ? (
      <>
        <Button title={t('onboarding.pushTurnOn')} isLoading={busy === 'push'} isDisabled={busy !== null} onPress={() => void handleTurnOnPush()} />
        <Button title={t('onboarding.pushNotNow')} variant="ghost" isLoading={busy === 'finish'} isDisabled={busy !== null} onPress={() => void finish()} />
      </>
    ) : (
      <View style={styles.footerRow}>
        {stepIndex > 0 ? <Button title={t('common.back')} variant="ghost" onPress={handleBack} style={styles.footerSide} /> : null}
        {step !== 'name' ? <Button title={t('common.skip')} variant="outline" onPress={() => setStepIndex((i) => i + 1)} style={styles.footerSide} /> : null}
        <Button title={t('common.next')} onPress={handleNext} style={styles.footerMain} />
      </View>
    );

  return (
    <Screen footer={footer}>
      <View style={styles.progress} accessibilityLabel={t('onboarding.progress', { step: stepIndex + 1, total: STEPS.length })}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.progressBar, i <= stepIndex && styles.progressBarDone]} />
        ))}
      </View>
      <Gap size="lg" />

      {step === 'name' ? (
        <>
          <Title>{t('onboarding.nameTitle')}</Title>
          <Gap size="xs" />
          <Muted>{t('onboarding.nameSubtitle')}</Muted>
          <Gap size="lg" />
          <AvatarEditor userId={userId} uri={avatarUrl} name={name} onChange={setAvatarUrl} />
          <Field
            label={t('onboarding.nameLabel')}
            value={name}
            onChangeText={setName}
            error={nameError}
            placeholder={t('auth.namePlaceholder')}
            textContentType="name"
            autoComplete="name"
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={handleNext}
          />
        </>
      ) : null}

      {step === 'dietary' ? (
        <>
          <Title>{t('onboarding.dietaryTitle')}</Title>
          <Gap size="xs" />
          <Muted>{t('onboarding.dietarySubtitle')}</Muted>
          <Gap size="lg" />
          <TagChips options={DIETARY} value={dietary} onChange={setDietary} tone="leaf" />
        </>
      ) : null}

      {step === 'allergens' ? (
        <>
          <Title>{t('onboarding.allergensTitle')}</Title>
          <Gap size="xs" />
          <Muted>{t('onboarding.allergensSubtitle')}</Muted>
          <Gap size="lg" />
          <TagChips options={ALLERGENS} value={allergens} onChange={setAllergens} tone="danger" />
          <Gap size="lg" />
          <View style={styles.note}>
            <Icon name="info" size={18} color={colors.textMuted} />
            <Small style={styles.noteText}>{t('onboarding.allergensNote')}</Small>
          </View>
        </>
      ) : null}

      {step === 'notifications' ? (
        <>
          <View style={styles.bell}>
            <Icon name="bell" size={34} color={colors.amberDeep} />
          </View>
          <Gap size="lg" />
          <Title>{t('onboarding.pushTitle')}</Title>
          <Gap size="xs" />
          <Muted>{t('onboarding.pushSubtitle')}</Muted>
          <Gap size="lg" />
          {[t('onboarding.pushPoint1'), t('onboarding.pushPoint2'), t('onboarding.pushPoint3')].map((point) => (
            <View key={point} style={styles.point}>
              <Icon name="check" size={18} color={colors.leafDeep} />
              <Body style={styles.pointText}>{point}</Body>
            </View>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: space.xs },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surfaceRaised },
  progressBarDone: { backgroundColor: colors.amber },
  footerRow: { flexDirection: 'row', gap: space.sm },
  footerSide: { paddingHorizontal: space.md },
  footerMain: { flex: 1 },
  note: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface },
  noteText: { flex: 1 },
  bell: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.amberSoft, alignItems: 'center', justifyContent: 'center' },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingVertical: space.xs },
  pointText: { flex: 1 },
});
