// base64 → bytes, for uploading an image read by expo-image-manipulator. Hermes has atob, but a
// Uint8Array is what supabase-js storage needs for a binary body.
export function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
