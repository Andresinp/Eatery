import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { ApiError, api } from './api';

const MAX_SIDE = 800;

// Lets the person choose a photo from their library, shrinks it to at most 800px on the long side
// as a JPEG and uploads it to avatars/<userId>/. Returns its public URL, or null when they closed
// the picker without choosing.
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;

  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_SIDE) {
    context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  try {
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    if (!saved.base64) throw new ApiError('unknown', 'image manipulator returned no base64');
    return await api.uploadImage('avatars', userId, saved.base64);
  } finally {
    image.release();
    context.release();
  }
}
