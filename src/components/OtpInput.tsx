import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppIcon, icons } from './AppIcon';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import {
  accentColor,
  accentSoft,
  borderColor,
  cardBgSoft,
  dangerColor,
  textDark,
} from '../constans/Color';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

/**
 * The 6-digit code from the reset email.
 *
 * One real TextInput behind six boxes, not six inputs. Six inputs each need
 * their own ref, have to forward on type and backspace, and they break
 * platform autofill and paste — a driver pasting the code out of their mail app
 * is the common case and it has to work.
 *
 * The boxes are a view of the value; tapping anywhere focuses the one hidden
 * input. The next empty box is tinted so it is obvious where typing will land.
 */
export function OtpInput({
  value,
  onChangeText,
  length = 6,
  error,
}: {
  value: string;
  onChangeText: (next: string) => void;
  length?: number;
  error?: string;
}) {
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const digits = value.split('');

  return (
    <View style={BaseStyle.width100Percent}>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[BaseStyle.flexDirectionRow, BaseStyle.justifyContentSpaceBetween]}>
        {Array.from({ length }, (_, i) => {
          const filled = digits[i] !== undefined;
          const next = i === value.length;
          return (
            <View
              key={i}
              style={[
                BaseStyle.alignJustifyCenter,
                BaseStyle.borderRadius10,
                styles.box,
                next && styles.boxNext,
                filled && styles.boxFilled,
                Boolean(error) && styles.boxError,
              ]}>
              <Text style={[fontStyle.fontSizeLargeX, fontStyle.fontWeightMedium, styles.digit]}>
                {filled ? digits[i] : ''}
              </Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={nextValue => onChangeText(nextValue.replace(/[^0-9]/g, '').slice(0, length))}
        keyboardType="number-pad"
        // Lets the platform lift the code out of the notification instead of
        // the driver retyping it.
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        style={styles.hidden}
        autoFocus
      />

      {Boolean(error) && (
        <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.errorRow]}>
          <AppIcon name={icons.alert} size={14} color={dangerColor} />
          <Text style={[fontStyle.fontSizeSmall1x, styles.error]}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: wp(12.5),
    height: hp(5.8),
    backgroundColor: cardBgSoft,
    borderWidth: 1.5,
    borderColor: borderColor,
  },
  boxNext: { borderColor: accentColor, backgroundColor: accentSoft },
  boxFilled: { borderColor: borderColor },
  boxError: { borderColor: dangerColor },
  digit: { color: textDark },
  // Off screen rather than display:none — a hidden input cannot take focus,
  // and focus is the whole mechanism here.
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  errorRow: { marginTop: spacings.normalx },
  error: { color: dangerColor, marginLeft: spacings.small },
});
