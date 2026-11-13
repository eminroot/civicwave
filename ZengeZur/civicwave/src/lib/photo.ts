import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

export type Photo = { uri: string; base64: string; mime: string };

type PickedAsset = {
  uri: string;
  width?: number;
  height?: number;
  mimeType?: string | null;
};

const LONG_EDGE = 1600;

/**
 * Shrinks a picked photo to at most 1600 px on its long side as a JPEG. A 3 to 5 MB
 * phone photo becomes a few hundred KB, so the AI check and the upload both get faster.
 */
export async function preparePhoto(asset: PickedAsset): Promise<Photo> {
  try {
    const context = ImageManipulator.manipulate(asset.uri);
    const w = asset.width ?? 0;
    const h = asset.height ?? 0;
    if (Math.max(w, h) > LONG_EDGE) {
      context.resize(w >= h ? { width: LONG_EDGE } : { height: LONG_EDGE });
    }
    const image = await context.renderAsync();
    const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true });
    if (out.base64) return { uri: out.uri, base64: out.base64, mime: 'image/jpeg' };
  } catch {
    // fall back to the original file below
  }
  const base64 = await new File(asset.uri).base64();
  return { uri: asset.uri, base64, mime: asset.mimeType || 'image/jpeg' };
}

/**
 * Copies the photo into the app's documents folder, so a report that is still waiting
 * for the network keeps its photo even if the system clears the cache.
 */
export async function keepPhoto(uri: string, id: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  try {
    const dir = new Directory(Paths.document, 'reports');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const dest = new File(dir, `${id}.jpg`);
    if (dest.exists) dest.delete();
    await new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}
