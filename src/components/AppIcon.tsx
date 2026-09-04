import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { textBody } from '../constans/Color';

/**
 * The app's only icon component.
 *
 * One family — Ionicons — on purpose. Mixing sets is the fastest way to make
 * an app look assembled rather than designed: stroke weights and corner radii
 * differ between families and it shows most at small sizes.
 *
 * Wrapped rather than imported directly so the family is one edit away, and so
 * every icon has a default colour and size instead of each caller guessing.
 */
export function AppIcon({
  name,
  size = 22,
  color = textBody,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

/**
 * Icon names used across the app, in one place for the same reason the text is.
 *
 * A typo in an icon name renders nothing at all — no error, no box — so a
 * misspelling in a screen is invisible until someone looks at that screen.
 */
export const icons = {
  // Tabs
  duty: 'time-outline',
  dutyActive: 'time',
  route: 'map-outline',
  routeActive: 'map',
  inspect: 'clipboard-outline',
  inspectActive: 'clipboard',
  messages: 'chatbubble-outline',
  messagesActive: 'chatbubble',
  me: 'person-outline',
  meActive: 'person',

  // Onboarding
  logbook: 'document-text-outline',
  pin: 'location-outline',
  offline: 'cloud-offline-outline',

  // Auth
  mail: 'mail-outline',
  lock: 'lock-closed-outline',
  eye: 'eye-outline',
  eyeOff: 'eye-off-outline',
  shield: 'shield-checkmark-outline',

  // Notifications. Distinct from `messages` on purpose: a bell means
  // "something happened", a speech bubble means "someone said something".
  bell: 'notifications-outline',
  bellActive: 'notifications',

  // Actions and state
  back: 'chevron-back',
  forward: 'chevron-forward',
  close: 'close',
  check: 'checkmark',
  checkCircle: 'checkmark-circle',
  alert: 'alert-circle-outline',
  warning: 'warning-outline',
  truck: 'bus-outline',
  camera: 'camera-outline',
  send: 'send',
  signOut: 'log-out-outline',
  refresh: 'refresh',
  flag: 'flag-outline',
  download: 'cloud-download-outline',
} as const;
