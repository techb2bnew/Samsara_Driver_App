import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenWrapper, AppIcon } from '../components';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import { cardBgSoft, textBody, textDark, textFaint } from '../constans/Color';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

/**
 * A tab that is wired up but not built yet.
 *
 * Here on purpose rather than each tab shipping a half-screen: the navigation,
 * the auth gate and the theme are all real and testable now, and this makes it
 * obvious which tabs still have nothing behind them.
 */
export function Placeholder({
  title,
  hint,
  icon,
}: {
  title: string;
  hint: string;
  icon?: string;
}) {
  return (
    <ScreenWrapper>
      <View style={[BaseStyle.flex, BaseStyle.alignJustifyCenter]}>
        {Boolean(icon) && (
          <View style={[BaseStyle.alignJustifyCenter, styles.art]}>
            <AppIcon name={icon as string} size={wp(11)} color={textFaint} />
          </View>
        )}
        <Text
          style={[
            fontStyle.fontSizeLargeX,
            fontStyle.fontWeightMedium1x,
            BaseStyle.textAlign,
            styles.title,
          ]}>
          {title}
        </Text>
        <Text style={[fontStyle.fontSizeNormal1x, BaseStyle.textAlign, styles.hint]}>{hint}</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  art: {
    width: wp(24),
    height: wp(24),
    borderRadius: wp(12),
    backgroundColor: cardBgSoft,
    marginBottom: spacings.xxLarge,
  },
  title: { color: textDark, marginBottom: spacings.normalx },
  hint: { color: textBody, lineHeight: hp(2.9), maxWidth: wp(76) },
});
