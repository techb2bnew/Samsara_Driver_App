import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacings, style as fontStyle } from '../constans/Fonts';

/**
 * A status pill.
 *
 * Takes its two colours from the caller rather than owning a tone map: the
 * meanings differ by screen — a defect's "open" and a course's "assigned" are
 * both neutral-waiting but read differently — and a shared map would end up
 * with a key per screen anyway.
 */
export function Badge({
  label,
  color,
  background,
}: {
  label: string;
  color: string;
  background: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={[fontStyle.fontSizeExtraSmall, fontStyle.fontWeightMedium, { color }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 99,
    paddingHorizontal: spacings.large,
    paddingVertical: spacings.xsmall,
  },
});
