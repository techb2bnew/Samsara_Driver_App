import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export type Fix = {
  latitude: number;
  longitude: number;
  /** Metres the device thinks it could be out by. Unknown on some Androids. */
  accuracyM: number | null;
};

/* Re-exported so a screen needing both has one import. See geo.ts. */
export { metresBetween, formatDistance } from './geo';

/** Why there is no fix. The screen says something different for each. */
export type FixFailure = 'denied' | 'unavailable' | 'timeout';

/**
 * Asks for location permission, once.
 *
 * Android needs the runtime dialog and iOS needs the authorization call; the
 * package does not paper over the difference, so this does. Fine location is
 * requested rather than coarse: coarse can be a kilometre or more out, which
 * is the entire tolerance of the arrival check — it would pass a driver
 * standing in the wrong street and fail one standing at the gate.
 */
async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  /*
   * iOS reports the outcome through callbacks and gives no way to ask the
   * current state from JS. Resolving true on success and false on error is the
   * whole of the available information; a driver who declined is caught by
   * getCurrentPosition failing straight afterwards either way.
   */
  return new Promise<boolean>((resolve) => {
    Geolocation.requestAuthorization(
      () => resolve(true),
      () => resolve(false),
    );
  });
}

/**
 * One position, or a reason there is none.
 *
 * Resolves rather than rejects. Every caller has to handle "no fix" as an
 * ordinary answer — a lorry parked between two warehouses often has none, and
 * a screen that treats that as an exception ends up showing a driver a crash
 * dialog for standing in the wrong place.
 *
 * 15 seconds, and a 30 second cached fix is accepted. A cold GPS start under
 * cloud can take ten; refusing at five would fail the honest case constantly.
 * Half a minute of staleness is at most a few hundred metres for a vehicle
 * that is stationary, which it is when somebody is marking a stop.
 */
export async function currentFix(): Promise<
  { ok: true; fix: Fix } | { ok: false; reason: FixFailure }
> {
  if (!(await ensurePermission())) return { ok: false, reason: 'denied' };

  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (position) =>
        resolve({
          ok: true,
          fix: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyM:
              typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null,
          },
        }),
      (error) =>
        resolve({
          ok: false,
          // 1 is PERMISSION_DENIED, 3 is TIMEOUT, 2 is POSITION_UNAVAILABLE.
          reason: error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable',
        }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  });
}
