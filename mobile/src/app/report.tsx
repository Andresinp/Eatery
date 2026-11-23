import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { OptionRow } from '@/components/account/OptionRow';
import { Button, Empty, Field, Gap, Header, Muted, Screen, Section, SignInGate, Title, ToggleRow, errorMessage } from '@/components/ui';
import { MAX_REPORT_DETAILS, REPORT_REASONS, type ReportReason } from '@/lib/account-format';
import { api } from '@/lib/api';
import { logError } from '@/lib/log';
import { useUserId } from '@/lib/session';
import { space } from '@/theme';

type Params = { userId?: string; listingId?: string; orderId?: string };

function close(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/explore');
}

export default function Report() {
  const { t } = useTranslation();
  const me = useUserId();
  const { userId, listingId, orderId } = useLocalSearchParams<Params>();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [shouldBlock, setShouldBlock] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const header = <Header isModal title={t('report.title')} onBack={close} />;

  const reasonLabels: Record<ReportReason, string> = {
    unsafe_food: t('report.reasonUnsafeFood'),
    misleading_listing: t('report.reasonMisleading'),
    harassment: t('report.reasonHarassment'),
    scam: t('report.reasonScam'),
    other: t('report.reasonOther'),
  };

  if (!me) {
    return (
      <Screen scroll={false} header={header}>
        <SignInGate />
      </Screen>
    );
  }

  if (isSent) {
    return (
      <Screen scroll={false} header={header} footer={<Button title={t('common.done')} onPress={close} />}>
        <Empty icon="check" title={t('report.thanksTitle')} body={t('report.thanksBody')} />
      </Screen>
    );
  }

  const handleSubmit = async () => {
    if (!reason || isSending) return;
    setIsSending(true);
    try {
      await api.report({
        reporterId: me,
        reason,
        details: details.trim() || undefined,
        userId: userId ?? null,
        listingId: listingId ?? null,
        orderId: orderId ?? null,
      });
      if (userId && shouldBlock) await api.block(me, userId);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsSent(true);
    } catch (error) {
      logError('report', error);
      Alert.alert(t('errors.title'), errorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Screen
      header={header}
      footer={<Button title={t('report.submit')} isDisabled={!reason} isLoading={isSending} onPress={() => void handleSubmit()} />}>
      <Title>{t('report.heading')}</Title>
      <Gap size="xs" />
      <Muted>{t('report.intro')}</Muted>
      <Section label={t('report.reasonLabel')}>
        <View style={styles.options} accessibilityRole="radiogroup">
          {REPORT_REASONS.map((code) => (
            <OptionRow key={code} title={reasonLabels[code]} isSelected={reason === code} onPress={() => setReason(code)} />
          ))}
        </View>
      </Section>
      <Field
        label={`${t('report.detailsLabel')} · ${t('common.optional')}`}
        value={details}
        onChangeText={setDetails}
        placeholder={t('report.detailsPlaceholder')}
        multiline
        maxLength={MAX_REPORT_DETAILS}
      />
      {userId && userId !== me ? (
        <>
          <Gap />
          <ToggleRow title={t('report.alsoBlock')} help={t('report.alsoBlockHelp')} value={shouldBlock} onChange={setShouldBlock} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { gap: space.sm },
});
