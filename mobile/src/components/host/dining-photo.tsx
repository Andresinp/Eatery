import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { Small } from '@/components/ui';
import { api } from '@/lib/api';
import { donePhoto, type DraftAction, type PhotoItem } from '@/lib/host-draft';
import { pickPhotos, type PickSource } from '@/lib/host-photos';
import { logError } from '@/lib/log';
import { useMyProfile, useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/theme';

const SAVED_MAX = 4;

type Props = {
  photo: PhotoItem | null;
  dispatch: (action: DraftAction) => void;
  userId: string;
  error?: string;
};

// One photo of where guests eat. A new photo is also saved on the host's profile (newest first,
// at most four) so the next listing offers it again instead of asking for an upload.
export function DiningPhotoPicker({ photo, dispatch, userId, error }: Props) {
  const { t } = useTranslation();
  const profile = useMyProfile();
  const { refreshProfile } = useSession();
  const saved = profile?.dining_place_photos ?? [];
  const chosenUrl = photo?.url ?? null;

  const remember = async (url: string) => {
    try {
      await api.updateMyProfile(userId, { dining_place_photos: [url, ...saved.filter((u) => u !== url)].slice(0, SAVED_MAX) });
      await refreshProfile();
    } catch (err) {
      // The listing still gets the photo; only the shortcut for next time is lost.
      logError('save dining photo to profile', err);
    }
  };

  const upload = async (item: PhotoItem) => {
    if (!item.base64) return;
    dispatch({ type: 'updateDiningPhoto', id: item.id, patch: { status: 'uploading' } });
    try {
      const url = await api.uploadImage('listing-photos', userId, item.base64);
      dispatch({ type: 'updateDiningPhoto', id: item.id, patch: { status: 'done', url, base64: null } });
      void remember(url);
    } catch (err) {
      logError('dining photo upload', err);
      dispatch({ type: 'updateDiningPhoto', id: item.id, patch: { status: 'failed' } });
    }
  };

  const handlePick = async (source: PickSource) => {
    try {
      const result = await pickPhotos(source, 1);
      if (result.kind === 'denied') {
        Alert.alert(t('hostNew.photos.deniedTitle'), source === 'camera' ? t('hostNew.photos.deniedCamera') : t('errors.permission_photos'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('errors.openSettings'), onPress: () => void Linking.openSettings() },
        ]);
        return;
      }
      if (result.kind === 'cancelled') return;
      const image = result.images[0];
      if (!image) return;
      const item: PhotoItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        localUri: image.uri,
        base64: image.base64,
        url: null,
        status: 'uploading',
      };
      dispatch({ type: 'set', patch: { diningPhoto: item } });
      await upload(item);
    } catch (err) {
      logError('dining photo pick', err);
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
    Alert.alert(t('hostNew.diningPhoto.add'), undefined, [
      { text: t('hostNew.photos.library'), onPress: () => void handlePick('library') },
      { text: t('hostNew.photos.camera'), onPress: () => void handlePick('camera') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleChooseSaved = (url: string) => {
    void Haptics.selectionAsync();
    dispatch({ type: 'set', patch: { diningPhoto: donePhoto(url) } });
  };

  // The chosen photo first (it may be new, or from an older listing), then the saved ones.
  const tiles: PhotoItem[] = [...(photo ? [photo] : []), ...saved.filter((u) => u !== chosenUrl).map(donePhoto)];

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {tiles.map((item) => {
          const isChosen = item.id === photo?.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: isChosen }}
              accessibilityLabel={t('hostNew.diningPhoto.label')}
              onPress={() => (item.status === 'failed' ? void upload(item) : item.url ? handleChooseSaved(item.url) : undefined)}
              style={[styles.tile, isChosen && styles.tileChosen]}>
              <Image source={{ uri: item.url ?? item.localUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              {item.status === 'uploading' ? (
                <View style={styles.overlay}>
                  <ActivityIndicator color={colors.onPhoto} />
                </View>
              ) : null}
              {item.status === 'failed' ? (
                <View style={styles.overlay}>
                  <Icon name="alert" size={20} color={colors.onPhoto} />
                  <Small style={styles.overlayText}>{t('hostNew.photos.retry')}</Small>
                </View>
              ) : null}
              {isChosen && item.status === 'done' ? (
                <View style={styles.check}>
                  <Icon name="check" size={14} color={colors.amberInk} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('hostNew.diningPhoto.add')}
          onPress={handleAdd}
          style={({ pressed }) => [styles.tile, styles.add, !!error && styles.addError, pressed && styles.pressed]}>
          <Icon name="camera" size={24} color={colors.amberDeep} />
          <Small style={styles.addText}>{t('hostNew.diningPhoto.add')}</Small>
        </Pressable>
      </ScrollView>
      {error ? (
        <Small style={styles.error}>{error}</Small>
      ) : (
        <Small style={styles.help}>{saved.length > 0 ? t('hostNew.diningPhoto.helpSaved') : t('hostNew.diningPhoto.help')}</Small>
      )}
    </View>
  );
}

const TILE = 96;

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingVertical: 2 },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileChosen: { borderColor: colors.amberDeep },
  add: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.amberDeep, backgroundColor: colors.amberSoft, gap: 4 },
  addError: { borderColor: colors.danger },
  addText: { fontFamily: fonts.bodyBold, color: colors.amberInk, fontSize: 12, textAlign: 'center' },
  pressed: { opacity: 0.6 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.photoShade, alignItems: 'center', justifyContent: 'center', gap: 2 },
  overlayText: { color: colors.onPhoto, fontSize: 11 },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { marginTop: space.sm, color: colors.danger },
  help: { marginTop: space.sm, color: colors.textFaint },
});
