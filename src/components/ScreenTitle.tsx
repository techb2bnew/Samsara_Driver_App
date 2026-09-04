import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacings, style as fontStyle } from '../constans/Fonts';
import { textDark, textMuted } from '../constans/Color';
import { heightPercentageToDP as hp } from '../utils';

/**
 * The large title at the top of a tab's home screen.
 *
 * These screens have no navigation header — they are the root of their stack,
 * and a bar repeating the same word above a title is wasted height on a phone.
 */
export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={[fontStyle.fontSizeLarge2x, fontStyle.fontWeightMedium1x, styles.title]}>
        {title}
      </Text>
      {Boolean(subtitle) && (
        <Text style={[fontStyle.fontSizeNormal1x, styles.subtitle]}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: spacings.large, paddingBottom: spacings.xLarge },
  title: { color: textDark },
  subtitle: { color: textMuted, marginTop: spacings.normal, lineHeight: hp(2.8) },
});
