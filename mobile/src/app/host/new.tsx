import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { BasicsStep } from '@/components/host/basics-step';
import { DraftPreview } from '@/components/host/listing-cards';
import { PhotosStep } from '@/components/host/photos-step';
import { PriceStep } from '@/components/host/price-step';
import { SafetyStep } from '@/components/host/safety-step';
import { TypeStep } from '@/components/host/type-step';
import { WhenStep } from '@/components/host/when-step';
import { WhereStep } from '@/components/host/where-step';
import { Button, errorMessage, Header, Screen, SignInGate, Small } from '@/components/ui';
import { api } from '@/lib/api';
import { defaultCurrency } from '@/lib/host-currency';
import { draftReducer, draftToInput, emptyDraft, validateStep, WIZARD_STEPS, type StepErrors } from '@/lib/host-draft';
import { logError } from '@/lib/log';
import { useUserId } from '@/lib/session';
import { colors, radius, space } from '@/theme';

export default function NewListing() {
  const { t } = useTranslation();
  const userId = useUserId();
  const [state, dispatch] = useReducer(draftReducer, undefined, () => ({ draft: emptyDraft(defaultCurrency()), isDirty: false }));
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<StepErrors>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  // One key per wizard: a double tap or a retry after a timeout returns the same listing.
  const idempotencyKey = useRef(Crypto.randomUUID()).current;
  const scroll = useRef<ScrollViewInstance>(null);
  const { draft, isDirty } = state;
  const step = WIZARD_STEPS[stepIndex] ?? 'type';
  const isLast = stepIndex === WIZARD_STEPS.length - 1;

  const handleClose = () => {
    if (!isDirty) {
      router.back();
      return;
    }
    Alert.alert(t('hostNew.discardTitle'), t('hostNew.discardBody'), [
      { text: t('hostNew.keepEditing'), style: 'cancel' },
      { text: t('hostNew.discard'), style: 'destructive', onPress: () => router.back() },
    ]);
  };

  if (!userId) {
    return (
      <Screen scroll={false} header={<Header isModal onBack={() => router.back()} />}>
        <SignInGate title={t('host.signedOutTitle')} body={t('host.signedOutBody')} />
      </Screen>
    );
  }

  const goTo = (index: number) => {
    setErrors({});
    setPublishError(null);
    setStepIndex(index);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const handleNext = () => {
    const found = validateStep(step, draft, t, { minUnits: 0, isTimeChecked: true });
    if (Object.keys(found).length > 0) {
      setErrors(found);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    goTo(stepIndex + 1);
  };

  const handlePublish = async () => {
    // The start may have slipped into the past while the host was on later steps.
    for (const [index, id] of WIZARD_STEPS.entries()) {
      const found = validateStep(id, draft, t, { minUnits: 0, isTimeChecked: true });
      if (Object.keys(found).length > 0) {
        goTo(index);
        setErrors(found);
        return;
      }
    }
    setIsPublishing(true);
    setPublishError(null);
    try {
      const id = await api.createListing(userId, draftToInput(draft), idempotencyKey);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/host/listing/[id]', params: { id } });
    } catch (error) {
      logError('createListing', error);
      setPublishError(errorMessage(error));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsPublishing(false);
    }
  };

  const stepProps = { draft, dispatch, errors };
  const progress = (stepIndex + 1) / WIZARD_STEPS.length;

  return (
    <Screen
      scroll={false}
      contentStyle={styles.bare}
      header={
        <View>
          <Header isModal title={t('hostNew.stepOf', { n: stepIndex + 1, total: WIZARD_STEPS.length })} onBack={handleClose} />
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 1, max: WIZARD_STEPS.length, now: stepIndex + 1 }}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      }
      footer={
        <View>
          {publishError ? <Small style={styles.error}>{publishError}</Small> : null}
          <View style={styles.footerRow}>
            {stepIndex > 0 ? (
              <Button title={t('common.back')} variant="outline" style={styles.back} isDisabled={isPublishing} onPress={() => goTo(stepIndex - 1)} />
            ) : null}
            {isLast ? (
              <Button title={t('hostNew.publish')} style={styles.next} isLoading={isPublishing} onPress={() => void handlePublish()} />
            ) : (
              <Button title={t('common.next')} variant="dark" style={styles.next} onPress={handleNext} />
            )}
          </View>
        </View>
      }>
      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}>
        {step === 'type' ? <TypeStep {...stepProps} /> : null}
        {step === 'photos' ? <PhotosStep {...stepProps} userId={userId} /> : null}
        {step === 'basics' ? <BasicsStep {...stepProps} /> : null}
        {step === 'when' ? <WhenStep {...stepProps} /> : null}
        {step === 'where' ? <WhereStep {...stepProps} /> : null}
        {step === 'safety' ? <SafetyStep {...stepProps} /> : null}
        {step === 'price' ? <PriceStep {...stepProps} /> : null}
        {step === 'review' ? <DraftPreview draft={draft} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bare: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  content: { paddingHorizontal: space.md + 4, paddingTop: space.md, paddingBottom: space.xxl },
  track: { height: 4, marginHorizontal: space.md + 4, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.amber },
  footerRow: { flexDirection: 'row', gap: space.sm },
  back: { flex: 1 },
  next: { flex: 2 },
  error: { color: colors.danger, marginBottom: space.sm, textAlign: 'center' },
});
