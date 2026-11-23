import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Body, Gap, Small, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { MAX_PHOTOS, type PhotoItem } from '@/lib/host-draft';
import { pickPhotos, type PickSource } from '@/lib/host-photos';
import { logError } from '@/lib/log';
import { colors, fonts, radius, space } from '@/theme';

import type { StepProps } from './types';

type Props = StepProps & { userId: string; isHeaderShown?: boolean };

export function PhotosStep({ draft, dispatch, errors, userId, isHeaderShown = true }: Props) {
  const { t } = useTranslation();
  const remaining = MAX_PHOTOS - draft.photos.length;

  const upload = async (photo: PhotoItem) => {
    if (!photo.base64) return;
    dispatch({ type: 'updatePhoto', id: photo.id, patch: { status: 'uploading' } });
    try {
      const url = await api.uploadImage('listing-photos', userId, photo.base64);
      dispatch({ type: 'updatePhoto', id: photo.id, patch: { status: 'done', url, base64: null } });
    } catch (error) {
      logError('host photo upload', error);
      dispatch({ type: 'updatePhoto', id: photo.id, patch: { status: 'failed' } });
    }
  };

  const handlePick = async (source: PickSource) => {
    try {
      const result = await pickPhotos(source, remaining);
      if (result.kind === 'denied') {
        Alert.alert(t('hostNew.photos.deniedTitle'), source === 'camera' ? t('hostNew.photos.deniedCamera') : t('errors.permission_photos'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('errors.openSettings'), onPress: () => void Linking.openSettings() },
        ]);
        return;
      }
      if (result.kind === 'cancelled') return;
      const items = result.images.map((image) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        localUri: image.uri,
        base64: image.base64,
        url: null,
        status: 'uploading' as const,
      }));
      for (const item of items) dispatch({ type: 'addPhoto', photo: item });
      await Promise.all(items.map(upload));
    } catch (error) {
      logError('host pick photos', error);
      Alert.alert(t('hostNew.photos.pickFailed'));
    }
  };

  const handleAdd = () => {
    const options = [t('hostNew.photos.library'), t('hostNew.photos.camera'), t('common.cancel')];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 2 }, (index) => {
        if (index === 0) void handlePick('library');
        if (index === 1) void handlePick('camera');
      });
      return;
    }
    Alert.alert(t('hostNew.photos.add'), undefined, [
      { text: t('hostNew.photos.library'), onPress: () => void handlePick('library') },
      { text: t('hostNew.photos.camera'), onPress: () => void handlePick('camera') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handlePhotoPress = (photo: PhotoItem, index: number) => {
    const isCover = index === 0;
    const actions: { text: string; onPress: () => void; style?: 'destructive' }[] = [];
    if (photo.status === 'failed') actions.push({ text: t('hostNew.photos.retry'), onPress: () => void upload(photo) });
    if (!isCover) {
      actions.push({
        text: t('hostNew.photos.makeCover'),
        onPress: () => {
          void Haptics.selectionAsync();
          dispatch({ type: 'makeCover', id: photo.id });
        },
      });
    }
    actions.push({ text: t('hostNew.photos.remove'), style: 'destructive', onPress: () => dispatch({ type: 'removePhoto', id: photo.id }) });
    Alert.alert(isCover ? t('hostNew.photos.cover') : t('hostNew.photos.photo'), undefined, [
      ...actions,
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View>
      {isHeaderShown ? (
        <>
          <Title>{t('hostNew.photos.title')}</Title>
          <Gap size="sm" />
          <Body>{t('hostNew.photos.body')}</Body>
          <Gap size="lg" />
        </>
      ) : null}
      <View style={styles.grid}>
        {draft.photos.map((photo, index) => (
          <Pressable
            key={photo.id}
            accessibilityRole="button"
            accessibilityLabel={index === 0 ? t('hostNew.photos.cover') : t('hostNew.photos.photoN', { n: index + 1 })}
            accessibilityHint={t('hostNew.photos.hint')}
            onPress={() => handlePhotoPress(photo, index)}
            style={[styles.tile, index === 0 && styles.cover]}>
            <Image source={{ uri: photo.url ?? photo.localUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            {photo.status === 'uploading' ? (
              <View style={styles.overlay}>
                <ActivityIndicator color={colors.onPhoto} />
                <Small style={styles.overlayText}>{t('hostNew.photos.uploading')}</Small>
              </View>
            ) : null}
            {photo.status === 'failed' ? (
              <View style={styles.overlay}>
                <Icon name="alert" size={22} color={colors.onPhoto} />
                <Small style={styles.overlayText}>{t('hostNew.photos.failed')}</Small>
              </View>
            ) : null}
            {index === 0 ? (
              <View style={styles.coverBadge}>
                <Small style={styles.coverBadgeText}>{t('hostNew.photos.cover')}</Small>
              </View>
            ) : null}
          </Pressable>
        ))}
        {remaining > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('hostNew.photos.add')}
            onPress={handleAdd}
            style={({ pressed }) => [styles.tile, styles.add, draft.photos.length === 0 && styles.cover, pressed && styles.pressed]}>
            <Icon name="camera" size={28} color={colors.amberDeep} />
            <Small style={styles.addText}>{t('hostNew.photos.add')}</Small>
            <Small>{t('hostNew.photos.remaining', { count: remaining })}</Small>
          </Pressable>
        ) : null}
      </View>
      {errors.photos ? <Small style={styles.error}>{errors.photos}</Small> : <Small style={styles.help}>{t('hostNew.photos.help')}</Small>}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: { width: '100%', aspectRatio: 4 / 3 },
  add: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.amberDeep, backgroundColor: colors.amberSoft, gap: space.xs },
  addText: { fontFamily: fonts.bodyBold, color: colors.amberInk },
  pressed: { opacity: 0.6 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.photoShade, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  overlayText: { color: colors.onPhoto },
  coverBadge: {
    position: 'absolute',
    left: space.sm,
    top: space.sm,
    backgroundColor: colors.amber,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  coverBadgeText: { color: colors.amberInk, fontFamily: fonts.bodyBold },
  error: { marginTop: space.sm, color: colors.danger },
  help: { marginTop: space.sm, color: colors.textFaint },
});
