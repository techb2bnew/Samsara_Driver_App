import React from 'react';
import { Platform, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseStyle } from '../constans/Style';
import { spacings } from '../constans/Fonts';
import { appBg } from '../constans/Color';

/**
 * The frame every screen sits in.
 *
 * Handles the three things that are wrong on a real phone if each screen does
 * them itself: the notch, the keyboard covering the field being typed into,
 * and the status bar text colour.
 *
 * The app is light throughout, so the ground is set here once. A screen that
 * paints nothing borrows whatever navigator is behind it, which changes.
 *
 * ---------------------------------------------------------------------------
 * Why there is no KeyboardAvoidingView here any more
 * ---------------------------------------------------------------------------
 * There was, and it was the reason the sign-in fields hid behind the keyboard.
 * `behavior="padding"` shrinks the view from the bottom, which a ScrollView
 * inside it simply absorbs — the content never moves, so a field near the
 * bottom stays covered.
 *
 * `automaticallyAdjustKeyboardInsets` hands the job to the platform instead:
 * iOS insets the scroll view by the real keyboard height and scrolls the
 * focused field into view. Android already resizes the window
 * (windowSoftInputMode=adjustResize in the manifest), so it needs nothing.
 *
 * A screen with a control PINNED above the keyboard — the chat composer — is a
 * different problem and keeps its own KeyboardAvoidingView, because there the
 * thing that must move is not inside a scroll view.
 */
export function ScreenWrapper({
  children,
  scroll = false,
  padded = true,
  background = appBg,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  background?: string;
}) {
  const body = <View style={[BaseStyle.flex, padded && styles.padded]}>{children}</View>;

  return (
    <SafeAreaView style={[BaseStyle.flex, { backgroundColor: background }]}>
      {/* backgroundColor was removed from StatusBar in RN 0.87 — Android is
          edge-to-edge now and SafeAreaView paints the ground behind it. */}
      <StatusBar barStyle="dark-content" />
      {scroll ? (
        <ScrollView
          style={BaseStyle.flex}
          contentContainerStyle={styles.scrollBody}
          // Taps on a button while the keyboard is up should press the button,
          // not just dismiss the keyboard and make the driver tap twice.
          keyboardShouldPersistTaps="handled"
          // iOS only; Android resizes the window itself.
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: spacings.xxLarge },
  scrollBody: { flexGrow: 1 },
});
