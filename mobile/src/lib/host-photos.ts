import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

// Picking and shrinking listing photos before upload: at most 1600px on the long side, JPEG ~0.8.

export type PickSource = 'library' | 'camera';
export type PickResult =
  | { kind: 'picked'; images: { uri: string; base64: string }[] }
  | { kind: 'cancelled' }
  | { kind: 'denied' };

const MAX_SIDE = 1600;

async function shrink(uri: string, width: number, height: number): Promise<{ uri: string; base64: string }> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_SIDE) {
    context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!saved.base64) throw new Error('shrink: no base64 in result');
  return { uri: saved.uri, base64: saved.base64 };
}

export async function pickPhotos(source: PickSource, limit: number): Promise<PickResult> {
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { kind: 'denied' };
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: source === 'library' && limit > 1,
    selectionLimit: limit,
  };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return { kind: 'cancelled' };
  const images = await Promise.all(result.assets.slice(0, limit).map((a) => shrink(a.uri, a.width, a.height)));
  return { kind: 'picked', images };
}
