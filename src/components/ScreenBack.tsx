import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppIcon, icons } from './AppIcon';
import { spacings } from '../constans/Fonts';
import { textDark } from '../constans/Color';

/** Top-left chevron. Auth screens use this instead of a ghost button under the form. */
export function ScreenBack({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      style={styles.wrap}>
      <AppIcon name={icons.back} size={22} color={textDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingVertical: spacings.normal,
    marginBottom: spacings.large,
  },
});
