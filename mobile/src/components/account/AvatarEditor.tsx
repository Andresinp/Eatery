import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Avatar, Small, errorMessage } from '@/components/ui';
import { pickAndUploadAvatar } from '@/lib/account-photo';
import { logError } from '@/lib/log';
import { colors, shadow } from '@/theme';

import { showActionSheet } from './action-sheet';

type Props = { userId: string; uri: string | null; name: string; onChange: (uri: string | null) => void; size?: number };

// A big avatar with a camera badge: choose a photo (uploaded straight away) or remove it.
export function AvatarEditor({ userId, uri, name, onChange, size = 112 }: Props) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);

  const handleChoose = async () => {
    setIsUploading(true);
    try {
      const url = await pickAndUploadAvatar(userId);
      if (url) {
        onChange(url);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      logError('pickAndUploadAvatar', error);
      Alert.alert(t('errors.title'), errorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  const handlePress = () => {
    if (!uri) {
      void handleChoose();
      return;
    }
    showActionSheet({
      cancelLabel: t('common.cancel'),
      actions: [
        { label: t('profile.photoChange'), onPress: () => void handleChoose() },
        { label: t('profile.photoRemove'), onPress: () => onChange(null), isDestructive: true },
      ],
    });
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uri ? t('profile.photoChange') : t('profile.photoAdd')}
        accessibilityState={{ busy: isUploading }}
        disabled={isUploading}
        onPress={handlePress}>
        <Avatar uri={uri} name={name || '?'} size={size} />
        {isUploading ? (
          <View style={[styles.overlay, { borderRadius: size / 2 }]}>
            <ActivityIndicator color={colors.onPhoto} />
          </View>
        ) : null}
        <View style={styles.badge}>
          <Icon name="camera" size={18} color={colors.amberInk} />
        </View>
      </Pressable>
      <Small>{uri ? t('profile.photoChange') : t('profile.photoAdd')}</Small>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.amber,
    borderWidth: 3,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
});
