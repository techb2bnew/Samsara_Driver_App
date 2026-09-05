import React, { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AppIcon, icons } from './AppIcon';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import {
  accentColor,
  borderColor,
  cardBgSoft,
  dangerColor,
  placeholderColor,
  textDark,
  textMuted,
  inputFocusBg,
  inputErrorBg,
} from '../constans/Color';
import { heightPercentageToDP as hp } from '../utils';

export type CustomTextInputRef = React.ComponentRef<typeof TextInput>;

/**
 * The only text input in the app.
 *
 * Label lives above the field, with a red asterisk when the field is required.
 * The placeholder is a hint inside the empty box; a password field still
 * shows dots as soon as the driver types.
 *
 * The show/hide toggle swaps `secureTextEntry` on the same input rather than
 * rendering a second one, so the value and the keyboard survive the switch.
 * Both platforms reset the caret to 0 when that prop changes, dropping the
 * cursor in front of a half-typed password — `selection` is controlled for
 * exactly one render to put it back, then released so the caret belongs to the
 * driver again.
 */
export const CustomTextInput = React.forwardRef<
  CustomTextInputRef,
  {
    label: string;
    value: string;
    onChangeText: (next: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    icon?: string;
    secure?: boolean;
    keyboardType?: KeyboardTypeOptions;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    returnKeyType?: ReturnKeyTypeOptions;
    onSubmitEditing?: () => void;
    onBlur?: () => void;
    maxLength?: number;
    editable?: boolean;
    /**
     * Grows to a few lines and keeps Return as a newline rather than submit.
     *
     * Needed wherever a driver is describing something rather than filling a
     * field in — what is wrong with a truck, why a log is wrong. A single line
     * for those makes them write less than they should.
     */
    multiline?: boolean;
    autoComplete?: 'email' | 'password' | 'new-password' | 'off';
    textContentType?: 'emailAddress' | 'password' | 'newPassword' | 'oneTimeCode';
    style?: StyleProp<ViewStyle>;
  }
>(function CustomTextInput(
  {
    label,
    value,
    onChangeText,
    error,
    required = false,
    placeholder,
    icon,
    secure = false,
    keyboardType,
    autoCapitalize = 'none',
    returnKeyType,
    onSubmitEditing,
    onBlur,
    maxLength,
    editable = true,
    multiline = false,
    autoComplete,
    textContentType,
    style,
  },
  ref,
) {
  const [hidden, setHidden] = useState(secure);
  const [focused, setFocused] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>();

  useEffect(() => {
    if (!selection) return;
    const timer = setTimeout(() => setSelection(undefined), 0);
    return () => clearTimeout(timer);
  }, [selection]);

  const outline = error ? dangerColor : focused ? accentColor : borderColor;

  return (
    <View style={[styles.wrap, style]}>
      <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.labelRow]}>
        <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.label]}>
          {label}
        </Text>
        {required && (
          <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.asterisk]}>
            {' *'}
          </Text>
        )}
      </View>

      <View
        style={[
          BaseStyle.flexDirectionRow,
          // Centred on one line, top-aligned once it grows — a centred icon
          // next to four lines of text floats in the middle of the box.
          multiline ? BaseStyle.alignItemsFlexStart : BaseStyle.alignItemsCenter,
          BaseStyle.borderRadius10,
          styles.field,
          multiline && styles.fieldMultiline,
          { borderColor: outline },
          focused && !error && styles.fieldFocus,
          Boolean(error) && styles.fieldError,
        ]}>
        {Boolean(icon) && (
          <View style={styles.leading}>
            <AppIcon
              name={icon as string}
              size={18}
              color={error ? dangerColor : focused ? accentColor : textMuted}
            />
          </View>
        )}

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          editable={editable}
          multiline={multiline}
          // Return inserts a newline in a multiline box, so it must not also
          // dismiss the keyboard.
          blurOnSubmit={multiline ? false : returnKeyType !== 'next'}
          textAlignVertical={multiline ? 'top' : 'center'}
          selection={selection}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          style={[
            BaseStyle.flex,
            fontStyle.fontSizeNormal1x,
            styles.input,
            Platform.OS === 'android' ? styles.inputAndroid : null,
            multiline && styles.inputMultiline,
          ]}
        />

        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => {
              setSelection({ start: value.length, end: value.length });
              setHidden(current => !current);
            }}
            style={styles.toggle}>
            <AppIcon name={hidden ? icons.eye : icons.eyeOff} size={18} color={textMuted} />
          </Pressable>
        )}
      </View>

      {Boolean(error) && (
        <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.errorRow]}>
          <AppIcon name={icons.alert} size={13} color={dangerColor} />
          <Text style={[fontStyle.fontSizeSmall1x, styles.error]}>{error}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { width: '100%', marginBottom: spacings.xLarge },
  labelRow: { marginBottom: spacings.normal },
  label: { color: textMuted },
  asterisk: { color: dangerColor },
  field: {
    backgroundColor: cardBgSoft,
    borderWidth: 1.5,
    height: hp(5.6),
    paddingHorizontal: spacings.large,
  },
  fieldFocus: { backgroundColor: inputFocusBg },
  fieldError: { backgroundColor: inputErrorBg },
  leading: { marginRight: spacings.normalx },
  input: { color: textDark, paddingVertical: 0, margin: 0 },
  inputAndroid: { textAlignVertical: 'center' },
  /*
   * height is dropped rather than raised: the single-line field is a fixed
   * height so every input on a form lines up, and a multiline box has to be
   * free to grow past it.
   */
  fieldMultiline: {
    height: undefined,
    minHeight: hp(13),
    paddingVertical: spacings.normalx,
  },
  inputMultiline: { textAlignVertical: 'top' },
  toggle: { paddingLeft: spacings.normalx, paddingVertical: spacings.small },
  errorRow: { marginTop: spacings.normal },
  error: { color: dangerColor, marginLeft: spacings.small, flex: 1 },
});
