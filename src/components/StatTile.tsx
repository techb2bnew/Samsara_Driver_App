import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import { cardBg, shadowColor, textDark, textMuted } from '../constans/Color';
import { widthPercentageToDP as wp } from '../utils';

/**
 * One measured figure.
 *
 * The value is monospaced-by-weight rather than by family: three tiles in a row
 * with different digit widths jitter as the numbers tick over, and a driver
 * glancing at it reads the movement as a change.
 */
export function StatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: string;
  tone?: string;
}) {
  return (
    <View style={[BaseStyle.flex, styles.tile]}>
      {Boolean(icon) && <AppIcon name={icon as string} size={16} color={tone ?? textMuted} />}
      <Text
        style={[
          fontStyle.fontSizeLarge,
          fontStyle.fontWeightMedium1x,
          styles.value,
          Boolean(tone) && { color: tone },
        ]}>
        {value}
      </Text>
      <Text style={[fontStyle.fontSizeExtraSmall, styles.label]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: cardBg,
    borderRadius: 16,
    paddingVertical: spacings.xLarge,
    paddingHorizontal: spacings.normalx,
    marginHorizontal: wp(0.8),
    shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  value: { color: textDark, marginTop: spacings.normal, fontVariant: ['tabular-nums'] },
  label: { color: textMuted, marginTop: spacings.xxsmall },
});
