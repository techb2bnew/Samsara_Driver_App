import { Platform } from 'react-native';
import { notifications as t } from '../constans/Constants';

/**
 * The count on the app icon.
 *
 * ---------------------------------------------------------------------------
 * The two platforms do not agree on what a badge is
 * ---------------------------------------------------------------------------
 * iOS has an actual number on the springboard icon and an API that sets it.
 *
 * Android has no such API and never has. A launcher shows a dot — and, if it
 * feels like it, a number — only while the app has a LIVE notification in the
 * tray. So the only way to mark the icon on Android is to post a notification
 * and keep it there, and the only way to clear the icon is to cancel it.
 *
 * That is why this does both things at once rather than just setting a number:
 * one function, so a caller never has to know which platform it is on.
 *
 * ---------------------------------------------------------------------------
 * What it cannot do
 * ---------------------------------------------------------------------------
 * This runs in JavaScript, so it only runs while the app does — foreground, or
 * warm in the background. A message that arrives while the phone is locked and
 * the app is closed changes nothing on the icon until the driver next opens it.
 *
 * Making the icon correct on a closed phone is not a bigger version of this
 * work; it is different work. The server has to reach the handset, which means
 * APNs and FCM credentials and something to send with them.
 * `driver_devices.push_token` is where that will hook in.
 */

type Module = typeof import('@notifee/react-native');

let cached: Module | null | undefined;

function lib(): Module | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('@notifee/react-native') as Module;
  } catch {
    // Built before the library was added. Every function here turns into a
    // no-op rather than taking the app down over a decoration.
    cached = null;
  }
  return cached;
}

/** False when the app was built before the library was added. */
export function badgesAvailable(): boolean {
  return lib() !== null;
}

/*
 * One id, reused.
 *
 * A notification posted under an id it already holds REPLACES that one. Post
 * under a fresh id each time and the driver ends up with eleven notifications
 * counting up to eleven, which is how a helpful number becomes a nuisance.
 */
const TRAY_ID = 'unread-summary';
const CHANNEL_ID = 'alerts';

/** Created once, then awaited. Android refuses to post without a channel. */
let channel: Promise<string> | null = null;

function ensureChannel(mod: Module): Promise<string> {
  if (!channel) {
    channel = mod.default
      .createChannel({
        id: CHANNEL_ID,
        name: t.trayChannel,
        description: t.trayChannelHint,
        importance: mod.AndroidImportance.DEFAULT,
        badge: true,
      })
      .catch(() => CHANNEL_ID);
  }
  return channel;
}

/**
 * Ask for permission to mark the icon at all.
 *
 * Both platforms gate this, and Android has since 13. Called after sign-in
 * rather than on first launch: a driver who has just been handed a work phone
 * and typed their password understands why the app wants to tell them about a
 * route, where the same prompt on a cold launch is just noise to dismiss.
 */
export async function askPermission(): Promise<void> {
  const mod = lib();
  if (!mod) return;
  try {
    await mod.default.requestPermission();
  } catch {
    // Refused, or an OS that did not ask. Either way there is nothing to do:
    // showUnread below will fail quietly and the in-app bell still works.
  }
}

/**
 * Put `count` on the icon, with `newest` as the line the driver reads.
 *
 * `newest` matters more than the number. A tray entry that says only "3" makes
 * the driver open the app to find out whether it was worth stopping for; one
 * that says "Route DEL-114 has been assigned to you" often answers it outright.
 */
export async function showUnread(count: number, newest: string | null): Promise<void> {
  const mod = lib();
  if (!mod) return;

  if (count <= 0) {
    await clearUnread();
    return;
  }

  try {
    await mod.default.setBadgeCount(count);
  } catch {
    // iOS only, and harmless where it is not supported.
  }

  if (Platform.OS !== 'android') return;

  try {
    await ensureChannel(mod);
    await mod.default.displayNotification({
      id: TRAY_ID,
      title: t.unread(count),
      body: newest ?? t.trayFallback,
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher',
        badgeCount: count,
        /*
         * Alerts on the first post and stays silent on every update after it.
         * Without this, a count ticking 1 → 2 → 3 buzzes the phone three times
         * for what is one piece of news.
         */
        onlyAlertOnce: true,
        /* Required, or tapping the notification does nothing at all. */
        pressAction: { id: 'default' },
      },
    });
  } catch {
    // A launcher that refuses, or permission never granted. The in-app bell is
    // the real surface; this is a hint on top of it.
  }
}

/**
 * Take the mark off the icon.
 *
 * Called on sign-out as well as at zero. A work phone changes hands, and a
 * badge left behind belongs to whoever signed in last — it would sit on the
 * icon telling the next driver about messages that are not theirs and that
 * they cannot open.
 */
export async function clearUnread(): Promise<void> {
  const mod = lib();
  if (!mod) return;
  try {
    await mod.default.setBadgeCount(0);
  } catch {
    // As above.
  }
  try {
    await mod.default.cancelNotification(TRAY_ID);
  } catch {
    // Nothing posted. Fine.
  }
}
