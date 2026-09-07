import { PermissionsAndroid, Platform } from 'react-native';
import type { ImagePickerResponse } from 'react-native-image-picker';
import { normaliseMimeType } from './mime';

/**
 * Taking or choosing one photograph.
 *
 * Wrapped rather than called directly for two reasons. The module is loaded
 * lazily, so an app built before the library was added shows "photos are not
 * available in this build" instead of a red screen — the same failure the
 * geolocation module hands out, and the one that cost an afternoon. And every
 * caller gets one shape back: a picture, a cancellation, or a reason.
 */

export type Picture = {
  uri: string;
  fileName: string;
  mimeType: string;
  /** Bytes. Null when the platform did not say. */
  size: number | null;
  /**
   * The file's contents, base64.
   *
   * Carried rather than read from the uri later, because in bare React Native
   * there is no reliable way to read a file:// uri. `fetch(uri).arrayBuffer()`
   * — which is what Supabase's own React Native example does — resolves with
   * an EMPTY buffer here: no error, a zero-byte upload, and paperwork that
   * appeared to send and arrived as nothing.
   *
   * At 1600px and 0.7 quality a photo is 200-400 KB, so its base64 is roughly
   * 270-540 KB held for as long as the screen is open. That is the cost of
   * having the bytes at all.
   */
  base64: string;
};

export type PickOutcome =
  | { ok: true; picture: Picture }
  /** The driver backed out. Not an error, and nothing should be said about it. */
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; reason: string };

type PickerModule = typeof import('react-native-image-picker');

let cached: PickerModule | null | undefined;

function picker(): PickerModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('react-native-image-picker') as PickerModule;
  } catch {
    cached = null;
  }
  return cached;
}

/** False when the app was built before the library was added. */
export function photosAvailable(): boolean {
  return picker() !== null;
}

/*
 * 1600px and 0.7 quality.
 *
 * A delivery note has to be readable, not archival. A modern phone camera
 * produces 4-6 MB per shot; at this size a note is 200-400 KB and still legible
 * enough to read a signature, which matters on a connection that is one bar in
 * a yard and metered besides.
 */
const LIMITS = { maxWidth: 1600, maxHeight: 1600, quality: 0.7 } as const;

function fromResponse(response: ImagePickerResponse): PickOutcome {
  if (response.didCancel) return { ok: false, cancelled: true };
  if (response.errorMessage) {
    return { ok: false, cancelled: false, reason: response.errorMessage };
  }

  const asset = response.assets?.[0];
  if (!asset?.uri) {
    return { ok: false, cancelled: false, reason: 'No photo was returned.' };
  }
  if (!asset.base64) {
    /*
     * Refused rather than uploaded empty. Without the contents there is
     * nothing to send, and sending nothing is the failure this whole path
     * exists to avoid.
     */
    return { ok: false, cancelled: false, reason: 'That photo could not be read.' };
  }

  return {
    ok: true,
    picture: {
      uri: asset.uri,
      fileName: asset.fileName ?? 'photo.jpg',
      /*
       * Normalised, because Android reports image/jpg — which is not a MIME
       * type and which storage rejects. See helpers/mime.
       */
      mimeType: normaliseMimeType(asset.type),
      size: typeof asset.fileSize === 'number' ? asset.fileSize : null,
      base64: asset.base64,
    },
  };
}

/**
 * The camera permission, only if something has made it necessary.
 *
 * The library needs none — launchCamera hands off to the system camera app,
 * which returns one photo the driver chose to take. But Android's rule is that
 * a permission DECLARED in the merged manifest becomes REQUIRED, and any
 * dependency can put it there. So: if it is already granted, or the request is
 * refused because nothing declared it, carry on either way. The only case this
 * changes is the one where it genuinely is needed.
 *
 * Never blocks. A refusal here is followed by launchCamera failing with its
 * own message, which is a better thing to show than a guess made up front.
 */
async function warmCameraPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (already) return;
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
  } catch {
    // Nothing to do. Proceed and let the camera itself answer.
  }
}

export async function takePhoto(): Promise<PickOutcome> {
  const mod = picker();
  if (!mod) return { ok: false, cancelled: false, reason: 'not-available' };

  await warmCameraPermission();

  const response = await mod.launchCamera({
    mediaType: 'photo',
    // The only reliable way to get the bytes in bare React Native. See Picture.
    includeBase64: true,
    saveToPhotos: false,
    ...LIMITS,
  });
  return fromResponse(response);
}

export async function choosePhoto(): Promise<PickOutcome> {
  const mod = picker();
  if (!mod) return { ok: false, cancelled: false, reason: 'not-available' };

  const response = await mod.launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    includeBase64: true,
    ...LIMITS,
  });
  return fromResponse(response);
}
