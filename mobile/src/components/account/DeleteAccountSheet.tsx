import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Body, Button, Gap, Header, Muted, Screen, Title, errorMessage } from '@/components/ui';
import { DELETE_ACCOUNT_HELP_URL, openLink } from '@/lib/account-links';
import { api } from '@/lib/api';
import { logError } from '@/lib/log';
import { unregisterPush } from '@/lib/push';
import { useSession } from '@/lib/session';
import { colors, radius, space } from '@/theme';

type Props = { isVisible: boolean; onClose: () => void };

// What deleting the account does, then a second confirmation, then the deletion itself
// (App Store guideline 5.1.1(v): deletion has to be possible inside the app).
export function DeleteAccountSheet({ isVisible, onClose }: Props) {
  const { t } = useTranslation();
  const { signOut } = useSession();
  const [isDeleting, setIsDeleting] = useState(false);

  const points = [t('settings.deletePoint1'), t('settings.deletePoint2'), t('settings.deletePoint3'), t('settings.deletePoint4')];

  const doDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteAccount();
    } catch (error) {
      logError('deleteAccount', error);
      setIsDeleting(false);
      Alert.alert(t('errors.title'), errorMessage(error));
      return;
    }
    await unregisterPush();
    try {
      await signOut();
    } catch (error) {
      // The account is already gone on the server; the local session ends regardless.
      logError('signOut after deleteAccount', error);
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsDeleting(false);
    onClose();
    router.replace('/');
    Alert.alert(t('settings.deletedTitle'), t('settings.deletedBody'));
  };

  const handleClose = () => {
    if (!isDeleting) onClose();
  };

  const handleDelete = () => {
    Alert.alert(t('settings.deleteConfirmTitle'), t('settings.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.deleteConfirmButton'), style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <Screen
        edges={['bottom']}
        header={<Header isModal onBack={handleClose} />}
        footer={
          <>
            <Button title={t('settings.deleteButton')} variant="danger" isLoading={isDeleting} onPress={handleDelete} />
            <Button title={t('common.cancel')} variant="ghost" isDisabled={isDeleting} onPress={onClose} />
          </>
        }>
        <View style={styles.icon}>
          <Icon name="trash" size={28} color={colors.danger} />
        </View>
        <Gap />
        <Title>{t('settings.deleteTitle')}</Title>
        <Gap size="sm" />
        <Muted>{t('settings.deleteIntro')}</Muted>
        <Gap size="lg" />
        {points.map((point) => (
          <View key={point} style={styles.point}>
            <View style={styles.bullet} />
            <Body style={styles.pointText}>{point}</Body>
          </View>
        ))}
        <Gap />
        <Button title={t('settings.deleteLearnMore')} variant="ghost" onPress={() => openLink(DELETE_ACCOUNT_HELP_URL)} />
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  icon: { width: 60, height: 60, borderRadius: radius.pill, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  point: { flexDirection: 'row', gap: space.sm, paddingVertical: space.xs },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger, marginTop: 9 },
  pointText: { flex: 1 },
});
