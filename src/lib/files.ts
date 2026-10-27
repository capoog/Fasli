import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

export type PickedFile = { name: string; mime: string; size: number; bytes: ArrayBuffer };

const MAX = 20 * 1024 * 1024;

async function readBytes(uri: string, webFile?: Blob): Promise<ArrayBuffer> {
  if (webFile) return webFile.arrayBuffer();
  if (Platform.OS === 'web') return (await fetch(uri)).arrayBuffer();
  return new File(uri).arrayBuffer();
}

export function guessMime(name: string, given?: string | null): string {
  if (given && given !== 'application/octet-stream') return given;
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'md') return 'text/markdown';
  return 'text/plain';
}

/** Lets the teacher pick PDFs, photos or text files. Throws 'too_big' for files over 20 MB. */
export async function pickDocuments(): Promise<PickedFile[]> {
  const r = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*', 'text/plain', 'text/markdown'],
    multiple: true,
    copyToCacheDirectory: true,
    base64: false,
  });
  if (r.canceled) return [];
  const out: PickedFile[] = [];
  for (const a of r.assets) {
    if ((a.size ?? 0) > MAX) throw new Error('too_big');
    out.push({ name: a.name, mime: guessMime(a.name, a.mimeType), size: a.size ?? 0, bytes: await readBytes(a.uri, a.file) });
  }
  return out;
}

/** Photograph a book page with the camera. */
export async function takePhoto(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const r = await ImagePicker.launchCameraAsync({ quality: 0.7, mediaTypes: ['images'] });
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  const name = a.fileName ?? `page-${Date.now()}.jpg`;
  return { name, mime: a.mimeType ?? 'image/jpeg', size: a.fileSize ?? 0, bytes: await readBytes(a.uri, a.file ?? undefined) };
}

export const kindFor = (mime: string): 'pdf' | 'image' | 'text' =>
  mime === 'application/pdf' ? 'pdf' : mime.startsWith('image/') ? 'image' : 'text';
