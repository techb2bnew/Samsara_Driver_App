import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton, StepDots, icons } from '../../components';
import { OnboardingArt } from './OnboardingArt';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  appBg,
  cardBg,
  shadowColor,
  textBody,
  textDark,
  textMuted,
} from '../../constans/Color';
import { onboarding } from '../../constans/Constants';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';
import { useAuth } from '../../context/AuthContext';
import { onboardingArt } from '../../assets/onboarding';

const ART = [onboardingArt.logbook, onboardingArt.route, onboardingArt.offline];

const CHIP_ICONS = [
  [icons.duty, icons.checkCircle],
  [icons.pin, icons.flag],
  [icons.offline, icons.download],
];

/**
 * Three screens' worth of introduction, in one screen.
 *
 * Shown once per phone, then never again — see AuthContext. Skip is on every
 * step rather than only the last: a driver handed a phone at 5am does not want
 * to read three cards.
 *
 * The picture is the point. Copy sits in a white sheet underneath so it reads
 * like a designed product, not like three headings with an icon.
 *
 * A horizontal swipe moves between steps the same way Next does.
 */
export function OnboardingScreen() {
  const { completeOnboarding } = useAuth();
  const [step, setStep] = useState(0);

  const enter = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    enter.setValue(0);
    Animated.spring(enter, {
      toValue: 1,
      useNativeDriver: true,
      speed: 16,
      bounciness: 5,
    }).start();
  }, [step, enter]);

  const last = step === onboarding.steps.length - 1;
  const current = onboarding.steps[step];

  function go(next: number) {
    if (next < 0 || next >= onboarding.steps.length) return;
    setStep(next);
  }

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -48) go(step + 1);
          else if (gesture.dx > 48) go(step - 1);
        },
      }),
    [step],
  );

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={BaseStyle.flex} edges={['top']}>
        <View style={[BaseStyle.flexDirectionRow, BaseStyle.justifyContentEnd, styles.topRow]}>
          <Pressable
            accessibilityRole="button"
            onPress={completeOnboarding}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
            <Text style={[fontStyle.fontSizeNormal1x, fontStyle.fontWeightThin1x, styles.skip]}>
              {onboarding.skip}
            </Text>
          </Pressable>
        </View>

        <Animated.View
          style={[
            BaseStyle.flex,
            BaseStyle.justifyContentCenter,
            {
              opacity: enter,
              transform: [
                { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              ],
            },
          ]}
          {...pan.panHandlers}>
          <OnboardingArt
            source={ART[step]}
            chips={current.chips.map((label, i) => ({ icon: CHIP_ICONS[step][i], label }))}
          />
        </Animated.View>
      </SafeAreaView>

      <View style={styles.sheet}>
        <Animated.View
          style={{
            opacity: enter,
            transform: [
              { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            ],
          }}>
          <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.stepLabel]}>
            {`${step + 1} / ${onboarding.steps.length}`}
          </Text>
          <Text style={[fontStyle.fontSizeLarge2x, fontStyle.fontWeightMedium1x, styles.title]}>
            {current.title}
          </Text>
          <Text style={[fontStyle.fontSizeNormal1x, styles.body]}>{current.body}</Text>
        </Animated.View>

        <View style={styles.bottom}>
          <StepDots count={onboarding.steps.length} active={step} />
          <CustomButton
            title={last ? onboarding.start : onboarding.next}
            icon={last ? undefined : icons.forward}
            onPress={() => {
              if (last) completeOnboarding();
              else go(step + 1);
            }}
            style={styles.action}
          />
        </View>
        <SafeAreaView edges={['bottom']} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  topRow: { paddingHorizontal: spacings.xxLarge, paddingTop: spacings.normal },
  skip: { color: textMuted },
  sheet: {
    backgroundColor: cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacings.xxLarge,
    paddingTop: spacings.xxxLarge,
    shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  stepLabel: { color: accentColor, letterSpacing: 1.2, marginBottom: spacings.normalx },
  title: {
    color: textDark,
    lineHeight: hp(4.2),
    marginBottom: spacings.large,
    maxWidth: wp(86),
  },
  body: { color: textBody, lineHeight: hp(2.8), marginBottom: spacings.xxLarge },
  bottom: { paddingBottom: spacings.large },
  action: { marginTop: spacings.xxLarge },
});
