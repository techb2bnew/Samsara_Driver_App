import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { BaseStyle } from '../constans/Style';
import { accentColor, accentSoft } from '../constans/Color';
import { widthPercentageToDP as wp } from '../utils';

/**
 * The branded icon-in-rings used on splash, onboarding and auth.
 *
 * Concentric discs rather than a flat square: it reads as a mark, not as a
 * coloured box, which is what Dribbble fleet shots do with a logo.
 */
export function BrandMark({
  icon,
  size = 'md',
  tone = 'light',
}: {
  icon: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'light' | 'dark';
}) {
  const core = size === 'lg' ? wp(28) : size === 'sm' ? wp(16) : wp(20);
  const ring = core * 1.36;
  const glow = core * 1.68;
  const dark = tone === 'dark';

  return (
    <View style={[BaseStyle.alignJustifyCenter, { width: glow, height: glow }]}>
      <View
        style={[
          styles.disc,
          {
            width: glow,
            height: glow,
            borderRadius: glow / 2,
            backgroundColor: dark ? 'rgba(233,69,69,0.10)' : 'rgba(233,69,69,0.08)',
          },
        ]}
      />
      <View
        style={[
          styles.disc,
          {
            width: ring,
            height: ring,
            borderRadius: ring / 2,
            top: (glow - ring) / 2,
            left: (glow - ring) / 2,
            backgroundColor: dark ? 'rgba(233,69,69,0.18)' : accentSoft,
          },
        ]}
      />
      <View
        style={[
          BaseStyle.alignJustifyCenter,
          {
            width: core,
            height: core,
            borderRadius: core / 2,
            backgroundColor: dark ? 'rgba(233,69,69,0.28)' : accentSoft,
          },
        ]}>
        <AppIcon name={icon} size={core * 0.38} color={accentColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { position: 'absolute', top: 0, left: 0 },
});
