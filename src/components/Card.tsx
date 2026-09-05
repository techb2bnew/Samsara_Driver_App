import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { spacings } from '../constans/Fonts';
import { cardBg, shadowColor } from '../constans/Color';

/**
 * The raised surface everything sits on.
 *
 * Same radius and lift as the login card, so a tab screen and an auth screen
 * feel like one product rather than two.
 */
export function Card({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: cardBg,
    borderRadius: 20,
    shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'hidden',
  },
  padded: { padding: spacings.xxLarge },
});
