import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { style as fontStyle } from '../constans/Fonts';
import { appBg, borderColor, cardBg, textDark } from '../constans/Color';

/**
 * The header every nested screen shares.
 *
 * Defined once here rather than per stack, so a stop opened from the route and
 * a course opened from Me get the same back button in the same place. Five
 * stacks each declaring their own is five chances to drift.
 *
 * Each stack's HOME screen hides this — those screens carry their own large
 * title, and a header above it would repeat the words.
 */
export const nestedScreenOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerTitleAlign: 'center',
  headerTintColor: textDark,
  headerStyle: { backgroundColor: cardBg },
  headerShadowVisible: false,
  headerTitleStyle: {
    ...StyleSheet.flatten(fontStyle.fontSizeNormal2x),
    ...StyleSheet.flatten(fontStyle.fontWeightMedium),
    color: textDark,
  },
  contentStyle: { backgroundColor: appBg },
  // A hairline instead of the platform shadow: the header sits on a light
  // ground and the default iOS shadow reads as a smudge on it.
  headerBackground: undefined,
  animation: 'slide_from_right',
};

/** A stack's own first screen. It titles itself. */
export const homeScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: appBg },
};

/** Kept for the divider colour, referenced by stacks that draw their own. */
export const headerBorderColor = borderColor;
