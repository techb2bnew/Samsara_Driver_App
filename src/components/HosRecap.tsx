import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import { textDark } from '../constans/Color';
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
 * Dark on a light screen on purpose: it has to be findable at a glance without
 * reading, and inverting it is what separates the decision from the record
 * above it.
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
    <View style={styles.strip}>
      <View style={[BaseStyle.flexDirectionRow, BaseStyle.flexWrap]}>
        {cells.map(([label, value]) => (
          <View
            key={label}
            style={[
              BaseStyle.flexDirectionRow,
              BaseStyle.alignItemsCenter,
              BaseStyle.justifyContentSpaceBetween,
              styles.cell,
            ]}>
            <Text style={[fontStyle.fontSizeSmall1x, styles.label]}>{label}</Text>
            <Text
              style={[fontStyle.fontSizeNormal1x, fontStyle.fontWeightMedium, styles.value]}>
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
  strip: {
    backgroundColor: textDark,
    borderRadius: 8,
    paddingVertical: spacings.normalx,
    paddingHorizontal: spacings.large,
  },
  cell: {
    width: '50%',
    paddingVertical: spacings.normal,
    paddingRight: spacings.large,
  },
  label: { color: 'rgba(255,255,255,0.62)' },
  value: { color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  note: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: spacings.normal,
    lineHeight: hp(2.1),
  },
});
