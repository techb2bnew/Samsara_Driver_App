import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  accentSoft,
  cardBg,
  shadowColor,
  textDark,
} from '../../constans/Color';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

/**
 * The picture for one onboarding step, plus two floating chips.
 *
 * The chips bob so the art feels alive without a Lottie file. Native-driven,
 * so it stays cheap on a mid-range Android.
 */
export function OnboardingArt({
  source,
  chips,
}: {
  source: ImageSourcePropType;
  chips: { icon: string; label: string }[];
}) {
  return (
    <View style={[BaseStyle.alignJustifyCenter, styles.stage]}>
      <View pointerEvents="none" style={styles.glow} />
      <Image source={source} style={styles.picture} resizeMode="contain" />
      {chips[0] && (
        <FloatChip icon={chips[0].icon} label={chips[0].label} delay={0} style={styles.chipLeft} />
      )}
      {chips[1] && (
        <FloatChip icon={chips[1].icon} label={chips[1].label} delay={280} style={styles.chipRight} />
      )}
    </View>
  );
}

function FloatChip({
  icon,
  label,
  delay,
  style,
}: {
  icon: string;
  label: string;
  delay: number;
  style: object;
}) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1600,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, delay]);

  return (
    <Animated.View
      style={[
        BaseStyle.flexDirectionRow,
        BaseStyle.alignItemsCenter,
        styles.chip,
        style,
        {
          transform: [
            { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
          ],
        },
      ]}>
      <View style={[BaseStyle.alignJustifyCenter, styles.chipIcon]}>
        <AppIcon name={icon} size={14} color={accentColor} />
      </View>
      <Text style={[fontStyle.fontSizeSmall1x, fontStyle.fontWeightMedium, styles.chipLabel]}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { width: '100%', height: hp(42) },
  glow: {
    position: 'absolute',
    width: wp(72),
    height: wp(72),
    borderRadius: wp(36),
    backgroundColor: accentSoft,
    opacity: 0.7,
  },
  picture: { width: wp(78), height: wp(78) },
  chip: {
    position: 'absolute',
    backgroundColor: cardBg,
    paddingVertical: spacings.normal,
    paddingLeft: spacings.normal,
    paddingRight: spacings.large,
    borderRadius: 22,
    shadowColor,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  chipLeft: { left: wp(2), top: hp(6) },
  chipRight: { right: wp(2), bottom: hp(7) },
  chipIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: accentSoft,
    marginRight: spacings.normal,
  },
  chipLabel: { color: textDark },
});
