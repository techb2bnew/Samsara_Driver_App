import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, icons } from './AppIcon';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import { accentColor, accentSoft, borderColor, textDark, textFaint, textMuted } from '../constans/Color';
import { widthPercentageToDP as wp } from '../utils';

/**
 * One tappable row: icon, title, a line of detail, chevron.
 *
 * The shape of most of this app — the Me menu, a fault, an inspection, a
 * course. One component so the icon badge, the two type sizes and the tap
 * feedback are the same in all of them.
 *
 * `trailing` replaces the chevron when a row shows state instead of leading
 * somewhere, so a status pill and a chevron never appear together and imply
 * two different affordances.
 */
export function ListRow({
  icon,
  title,
  detail,
  extra,
  tone,
  trailing,
  onPress,
  last = false,
}: {
  icon?: string;
  title: string;
  detail?: string;
  extra?: string;
  tone?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  /** Drops the divider on the final row of a group. */
  last?: boolean;
}) {
  const body = (
    <>
      {Boolean(icon) && (
        <View style={[BaseStyle.alignJustifyCenter, styles.badge]}>
          <AppIcon name={icon as string} size={18} color={tone ?? accentColor} />
        </View>
      )}

      <View style={BaseStyle.flex}>
        <Text style={[fontStyle.fontSizeNormal1x, fontStyle.fontWeightMedium, styles.title]}>
          {title}
        </Text>
        {Boolean(detail) && (
          <Text style={[fontStyle.fontSizeSmall2x, styles.detail]}>{detail}</Text>
        )}
        {Boolean(extra) && (
          <Text style={[fontStyle.fontSizeSmall1x, styles.extra]}>{extra}</Text>
        )}
      </View>

      {trailing ??
        (Boolean(onPress) && <AppIcon name={icons.forward} size={18} color={textFaint} />)}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={[
          BaseStyle.flexDirectionRow,
          BaseStyle.alignItemsCenter,
          styles.row,
          !last && styles.divided,
        ]}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        BaseStyle.flexDirectionRow,
        BaseStyle.alignItemsCenter,
        styles.row,
        !last && styles.divided,
        pressed && styles.pressed,
      ]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: spacings.xLarge, paddingHorizontal: spacings.xxLarge },
  divided: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
  pressed: { opacity: 0.7 },
  badge: {
    width: wp(9.5),
    height: wp(9.5),
    borderRadius: 12,
    backgroundColor: accentSoft,
    marginRight: spacings.large,
  },
  title: { color: textDark },
  detail: { color: textMuted, marginTop: spacings.xxsmall },
  extra: { color: textFaint, marginTop: spacings.xxsmall },
});
