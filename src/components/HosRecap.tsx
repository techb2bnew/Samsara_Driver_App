import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import {
  cardBg,
  shadowColor,
  textDark,
  textFaint,
  textMuted,
} from '../constans/Color';
import { common, duty as t } from '../constans/Constants';
import { formatClock } from '../helpers/duty';
import type { Recap } from '../helpers/hosLimits';
import { heightPercentageToDP as hp } from '../utils';

/**
 * The four clocks, the way an ELD shows them.
 *
 * REMAINING time, not time used — "10:50 driving" means ten more hours are
 * allowed. This is the one strip on the screen a driver makes a decision from,
 * so the labels are the industry's own words and the figures are the ones they
 * expect next to them.
 *
 * A dash means not known, never zero. With no rule book chosen there is no
 * limit to subtract from, and "0:00 driving left" would stop a driver who has
 * eleven hours.
 */
export function HosRecap({ recap }: { recap: Recap }) {
  const cells: Array<[string, number | null]> = [
    [t.recap.onDuty, recap.onDuty],
    [t.recap.driving, recap.driving],
    [t.recap.breakIn, recap.breakIn],
    [t.recap.cycle, recap.cycle],
  ];

  const known = cells.some(([, value]) => value !== null);

  return (
    <View style={styles.card}>
      <Text style={[fontStyle.fontSizeExtraSmall, fontStyle.fontWeightMedium, styles.kicker]}>
        {t.recap.hoursLeft.toUpperCase()}
      </Text>
      <View style={[BaseStyle.flexDirectionRow, BaseStyle.flexWrap]}>
        {cells.map(([label, value]) => (
          <View key={label} style={[BaseStyle.alignItemsFlexStart, styles.cell]}>
            <Text style={[fontStyle.fontSizeExtraSmall, styles.label]}>{label}</Text>
            <Text
              style={[fontStyle.fontSizeMedium1x, fontStyle.fontWeightMedium1x, styles.value]}>
              {value === null ? common.dash : formatClock(value)}
            </Text>
          </View>
        ))}
      </View>

      {!known && (
        <Text style={[fontStyle.fontSizeExtraSmall, styles.note]}>{t.recap.noRegulator}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: cardBg,
    borderRadius: 20,
    paddingVertical: spacings.xLarge,
    paddingHorizontal: spacings.xxLarge,
    shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  kicker: { color: textFaint, letterSpacing: 1.1, marginBottom: spacings.large },
  cell: {
    width: '50%',
    paddingVertical: spacings.normal,
    paddingRight: spacings.large,
  },
  label: { color: textMuted },
  value: { color: textDark, marginTop: spacings.xxsmall, fontVariant: ['tabular-nums'] },
  note: {
    color: textMuted,
    marginTop: spacings.normal,
    lineHeight: hp(2.1),
  },
});
