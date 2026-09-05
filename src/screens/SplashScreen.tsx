import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark } from '../components/BrandMark';
import { icons } from '../components/AppIcon';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import {
  accentColor,
  brandWashMid,
  brandWashSoft,
  lightWash,
  onAccent,
  splashBgColor,
  splashText,
} from '../constans/Color';
import { APP_NAME, splash as t } from '../constans/Constants';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

/**
 * First frame on a cold start.
 *
 * Held for a few seconds on purpose — see RootNavigator — so the mark has
 * time to land rather than flashing past while the session is read.
 */
export function SplashScreen() {
  const enter = useRef(new Animated.Value(0)).current;
  const copy = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1,
      useNativeDriver: true,
      speed: 10,
      bounciness: 7,
    }).start();

    Animated.timing(copy, {
      toValue: 1,
      duration: 520,
      delay: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(bar, {
        toValue: 1,
        duration: 1600,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ).start();
  }, [enter, copy, pulse, bar]);

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <StatusBar barStyle="light-content" />
      <View pointerEvents="none" style={styles.orbOne} />
      <View pointerEvents="none" style={styles.orbTwo} />

      <SafeAreaView style={[BaseStyle.flex, BaseStyle.alignJustifyCenter]}>
        <View style={styles.markWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pulseRing,
              {
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
                transform: [
                  { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) },
                ],
              },
            ]}
          />
          <Animated.View
            style={{
              opacity: enter,
              transform: [
                { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }) },
              ],
            }}>
            <BrandMark icon={icons.truck} size="lg" tone="dark" />
          </Animated.View>
        </View>

        <Animated.View
          style={{
            opacity: copy,
            transform: [
              { translateY: copy.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            ],
          }}>
          <Text style={[fontStyle.fontSizeLarge2x, fontStyle.fontWeightMedium1x, styles.name]}>
            {APP_NAME}
          </Text>
          <Text style={[fontStyle.fontSizeNormal1x, styles.tagline]}>{t.tagline}</Text>
        </Animated.View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.foot}>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.thumb,
              {
                transform: [
                  {
                    translateX: bar.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-wp(8), wp(22)],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: splashBgColor },
  orbOne: {
    position: 'absolute',
    width: wp(70),
    height: wp(70),
    borderRadius: wp(35),
    backgroundColor: brandWashMid,
    top: -wp(16),
    right: -wp(20),
  },
  orbTwo: {
    position: 'absolute',
    width: wp(48),
    height: wp(48),
    borderRadius: wp(24),
    backgroundColor: brandWashSoft,
    bottom: hp(12),
    left: -wp(16),
  },
  markWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: spacings.xxLarge },
  pulseRing: {
    position: 'absolute',
    width: wp(36),
    height: wp(36),
    borderRadius: wp(18),
    borderWidth: 2,
    borderColor: accentColor,
  },
  name: { color: onAccent, letterSpacing: 0.2, textAlign: 'center' },
  tagline: {
    color: splashText,
    marginTop: spacings.normalx,
    textAlign: 'center',
    paddingHorizontal: spacings.xxLarge,
  },
  foot: { alignItems: 'center', paddingBottom: hp(4) },
  track: {
    width: wp(28),
    height: 4,
    borderRadius: 2,
    backgroundColor: lightWash,
    overflow: 'hidden',
  },
  thumb: {
    width: wp(8),
    height: 4,
    borderRadius: 2,
    backgroundColor: accentColor,
  },
});
