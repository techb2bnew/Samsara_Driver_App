import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AppIcon } from './AppIcon';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import {
  accentColor,
  accentPressed,
  borderStrong,
  cardBg,
  dangerColor,
  disabledBg,
  disabledText,
  onAccent,
  textBody,
} from '../constans/Color';
import { heightPercentageToDP as hp } from '../utils';

type Variant = 'primary' | 'outline' | 'danger' | 'ghost';

const PRESS_SCALE = 0.97;

/**
 * The only button in the app.
 *
 * Compact enough to sit under a form without eating the screen, still tall
 * enough to hit with a thumb. The scale is small on purpose: 0.97 reads as a
 * press, 0.9 reads as a bounce and gets tiring on a screen used all day.
 *
 * `loading` keeps the button mounted and swaps the label for a spinner rather
 * than unmounting it, so the layout does not jump while a write is in flight.
 */
export function CustomButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const press = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();

  const filled = variant === 'primary' || variant === 'danger';
  const labelColor = inactive
    ? disabledText
    : filled
      ? onAccent
      : variant === 'ghost'
        ? accentColor
        : textBody;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, BaseStyle.width100Percent, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        onPressIn={() => press(PRESS_SCALE)}
        onPressOut={() => press(1)}
        onPress={onPress}
        style={({ pressed }) => [
          styles.base,
          BaseStyle.alignJustifyCenter,
          variant === 'primary' && styles.primary,
          variant === 'primary' && pressed && styles.primaryPressed,
          variant === 'danger' && styles.danger,
          variant === 'outline' && styles.outline,
          variant === 'ghost' && styles.ghost,
          inactive && filled && styles.inactive,
        ]}>
        {loading ? (
          <ActivityIndicator color={filled ? onAccent : accentColor} />
        ) : (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter]}>
            {Boolean(icon) && (
              <View style={styles.icon}>
                <AppIcon name={icon as string} size={16} color={labelColor} />
              </View>
            )}
            <Text
              numberOfLines={1}
              style={[
                fontStyle.fontSizeNormal1x,
                fontStyle.fontWeightMedium,
                { color: labelColor },
              ]}>
              {title}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { height: hp(5.6), paddingHorizontal: spacings.xxLarge, width: '100%', borderRadius: 14 },
  primary: {
    backgroundColor: accentColor,
    shadowColor: accentColor,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryPressed: { backgroundColor: accentPressed },
  danger: { backgroundColor: dangerColor },
  outline: {
    backgroundColor: cardBg,
    borderWidth: 1,
    borderColor: borderStrong,
    borderRadius: 14,
  },
  ghost: { backgroundColor: 'transparent', height: hp(4.6), borderRadius: 14 },
  inactive: { backgroundColor: disabledBg, shadowOpacity: 0, elevation: 0 },
  icon: { marginRight: spacings.normalx },
});
