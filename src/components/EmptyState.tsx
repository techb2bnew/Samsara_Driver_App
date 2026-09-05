import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { CustomButton } from './CustomButton';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import { accentColor, accentSoft, textDark, textMuted } from '../constans/Color';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

/**
 * Nothing here, and why.
 *
 * Always a reason, never just "empty". A driver who sees "No route assigned"
 * with no explanation assumes the app is broken; "your fleet office assigns
 * routes" tells them it is working and nobody has given them one.
 */
export function EmptyState({
  icon,
  title,
  hint,
  actionLabel,
  onAction,
}: {
  icon?: string;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={[BaseStyle.alignItemsCenter, styles.wrap]}>
      {Boolean(icon) && (
        <View style={[BaseStyle.alignJustifyCenter, styles.art]}>
          <AppIcon name={icon as string} size={26} color={accentColor} />
        </View>
      )}
      <Text
        style={[
          fontStyle.fontSizeNormal2x,
          fontStyle.fontWeightMedium,
          BaseStyle.textAlign,
          styles.title,
        ]}>
        {title}
      </Text>
      {Boolean(hint) && (
        <Text style={[fontStyle.fontSizeNormal1x, BaseStyle.textAlign, styles.hint]}>{hint}</Text>
      )}
      {Boolean(actionLabel && onAction) && (
        <CustomButton
          title={actionLabel as string}
          variant="outline"
          onPress={onAction as () => void}
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: hp(8) },
  art: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: accentSoft,
    marginBottom: spacings.xLarge,
  },
  title: { color: textDark, marginBottom: spacings.normalx },
  hint: { color: textMuted, lineHeight: hp(2.6), maxWidth: wp(76) },
  action: { marginTop: spacings.xxLarge, width: wp(60) },
});
