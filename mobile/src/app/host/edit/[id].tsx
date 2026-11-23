import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { BasicsStep } from '@/components/host/basics-step';
import { PhotosStep } from '@/components/host/photos-step';
import { PriceStep } from '@/components/host/price-step';
import { SafetyStep } from '@/components/host/safety-step';
import { WhenStep } from '@/components/host/when-step';
import { WhereStep } from '@/components/host/where-step';
import { Button, Divider, Empty, ErrorState, errorMessage, Header, Heading, Loading, Screen, SignInGate, Small } from '@/components/ui';
import { api, type Listing, type ListingInput } from '@/lib/api';
import { draftFromListing, draftReducer, draftToInput, validateStep, type StepErrors, type StepId } from '@/lib/host-draft';
import { logError } from '@/lib/log';
import { useUserId } from '@/lib/session';
import { useAsync } from '@/lib/use-async';
import { colors, space } from '@/theme';

const SECTIONS: StepId[] = ['photos', 'basics', 'when', 'where', 'safety', 'price'];

type Props = { listing: Listing; address: string | null; userId: string };

function EditForm({ listing, address, userId }: Props) {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(draftReducer, undefined, () => ({ draft: draftFromListing(listing, address), isDirty: false }));
  const [errors, setErrors] = useState<StepErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { draft, isDirty } = state;
  const isTable = listing.listing_type === 'table';
  const booked = isTable
    ? (listing.seats_total ?? 0) - (listing.seats_available ?? 0)
    : (listing.quantity_total ?? 0) - (listing.quantity_available ?? 0);
  const originalStart = isTable ? listing.meal_time : listing.pickup_window_start;
  const isTimeChanged = !originalStart || new Date(originalStart).getTime() !== draft.start.getTime();

  const handleClose = () => {
    if (!isDirty) {
      router.back();
      return;
    }
    Alert.alert(t('hostNew.discardTitle'), t('hostManage.edit.discardBody'), [
      { text: t('hostNew.keepEditing'), style: 'cancel' },
      { text: t('hostNew.discard'), style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const handleSave = async () => {
    const found: StepErrors = {};
    for (const section of SECTIONS) {
      Object.assign(found, validateStep(section, draft, t, { minUnits: Math.max(0, booked), isTimeChecked: isTimeChanged }));
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSaveError(t('hostManage.edit.fixErrors'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      // The type of a listing never changes after it is published.
      const patch: Partial<ListingInput> = draftToInput(draft);
      delete patch.listing_type;
      await api.updateListing(listing, patch);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      logError('updateListing', error);
      setSaveError(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const stepProps = { draft, dispatch, errors };
  return (
    <Screen
      header={<Header title={t('hostManage.edit.title')} onBack={handleClose} />}
      footer={
        <View>
          {saveError ? <Small style={styles.error}>{saveError}</Small> : null}
          <Button title={t('common.save')} isLoading={isSaving} isDisabled={!isDirty} onPress={() => void handleSave()} />
        </View>
      }>
      <Heading>{t('hostManage.edit.photos')}</Heading>
      <Small style={styles.sub}>{t('hostNew.photos.body')}</Small>
      <PhotosStep {...stepProps} userId={userId} isHeaderShown={false} />
      <Divider />
      <Heading>{t('hostManage.edit.basics')}</Heading>
      <BasicsStep {...stepProps} isHeaderShown={false} />
      <Divider />
      <Heading>{isTable ? t('hostNew.when.titleTable') : t('hostNew.when.titleMarket')}</Heading>
      <WhenStep {...stepProps} minUnits={Math.max(0, booked)} isHeaderShown={false} />
      <Divider />
      <Heading>{t('hostNew.where.title')}</Heading>
      <WhereStep {...stepProps} isHeaderShown={false} />
      <Divider />
      <Heading>{t('hostNew.safety.title')}</Heading>
      <SafetyStep {...stepProps} isHeaderShown={false} isAutoSuggest={false} />
      <Divider />
      <Heading>{t('hostNew.price.title')}</Heading>
      <PriceStep {...stepProps} isHeaderShown={false} hasBookings={booked > 0} />
    </Screen>
  );
}

export default function EditListing() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const data = useAsync(async () => {
    if (!userId || !id) return null;
    const [listing, address] = await Promise.all([api.listing(id), api.listingAddress(id)]);
    return listing ? { listing, address } : null;
  }, [id, userId]);

  if (!userId) {
    return (
      <Screen scroll={false} header={<Header />}>
        <SignInGate title={t('host.signedOutTitle')} body={t('host.signedOutBody')} />
      </Screen>
    );
  }
  if (data.status === 'loading') {
    return (
      <Screen scroll={false} header={<Header title={t('hostManage.edit.title')} />}>
        <Loading />
      </Screen>
    );
  }
  if (data.status === 'error') {
    return (
      <Screen scroll={false} header={<Header title={t('hostManage.edit.title')} />}>
        <ErrorState error={data.error} onRetry={() => void data.reload()} />
      </Screen>
    );
  }
  const loaded = data.data;
  if (!loaded || loaded.listing.host_id !== userId) {
    return (
      <Screen scroll={false} header={<Header />}>
        <Empty icon="alert" title={t('hostManage.notFound')} body={t('hostManage.notFoundBody')} />
      </Screen>
    );
  }
  if (loaded.listing.status === 'cancelled') {
    return (
      <Screen scroll={false} header={<Header />}>
        <Empty icon="alert" title={t('hostManage.edit.cancelledTitle')} body={t('hostManage.edit.cancelledBody')} />
      </Screen>
    );
  }
  return <EditForm listing={loaded.listing} address={loaded.address} userId={userId} />;
}

const styles = StyleSheet.create({
  sub: { marginTop: space.xs, marginBottom: space.md },
  error: { color: colors.danger, marginBottom: space.sm, textAlign: 'center' },
});
