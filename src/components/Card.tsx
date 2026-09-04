import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BaseStyle } from '../constans/Style';
import { spacings } from '../constans/Fonts';
import { borderColor, cardBg, shadowColor } from '../constans/Color';

/**
 * The raised surface everything sits on.
 *
 * One component so the border, radius and lift are identical everywhere. The
 * shadow is deliberately almost nothing — on a light ground a real shadow
 * reads as a smudge, and the border is what actually separates the card.
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
  return (
    <View style={[BaseStyle.borderRadius10, styles.card, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: cardBg,
    borderWidth: 1,
    borderColor,
    shadowColor,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  padded: { padding: spacings.large },
});
