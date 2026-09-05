import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, icons } from './AppIcon';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import {
  accentColor,
  cardBg,
  shadowColor,
  textDark,
  textFaint,
} from '../constans/Color';
import { duty as t } from '../constans/Constants';
import { isoDate } from '../helpers/duty';
import { widthPercentageToDP as wp } from '../utils';

/**
 * Which day's log is on screen.
 *
 * Arrows rather than a calendar. A driver checks yesterday, or the day an
 * inspector asked about — both a tap or two back — and a date picker is a
 * native module, another rebuild, and a modal to dismiss for something that is
 * almost always one day.
 *
 * Forward stops at today. A log for a day that has not happened is not a thing
 * a driver can look at, and letting them page into next week would show an
 * empty grid that reads like lost data.
 *
 * Back stops at the oldest loaded day for the same reason — see earliestDate
 * in ShiftContext.
 */
export function DayPicker({
  date,
  earliest,
  onChange,
  embedded = false,
}: {
  date: Date;
  /** ISO date. Paging back stops here. */
  earliest: string;
  onChange: (next: Date) => void;
  /** Skip the raised card chrome when this already sits inside one. */
  embedded?: boolean;
}) {
  const today = new Date();
  const key = isoDate(date);
  const isToday = key === isoDate(today);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = key === isoDate(yesterday);

  const canGoBack = key > earliest;
  const canGoForward = !isToday;

  const shift = (days: number) => {
    const next = new Date(date);
    next.setDate(date.getDate() + days);
    onChange(next);
  };

  const label = isToday
    ? t.today
    : isYesterday
      ? t.yesterday
      : date.toLocaleDateString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });

  return (
    <View
      style={[
        BaseStyle.flexDirectionRow,
        BaseStyle.alignItemsCenter,
        BaseStyle.justifyContentSpaceBetween,
        styles.bar,
        embedded && styles.embedded,
      ]}>
      <Arrow
        icon={icons.back}
        label={t.previousDay}
        disabled={!canGoBack}
        onPress={() => shift(-1)}
      />

      <Pressable
        accessibilityRole="button"
        disabled={isToday}
        onPress={() => onChange(new Date())}
        style={BaseStyle.alignItemsCenter}>
        <Text style={[fontStyle.fontSizeNormal2x, fontStyle.fontWeightMedium, styles.label]}>
          {label}
        </Text>
        {/* Only when it would do something. A permanent "back to today" under
            today's own label is a control that never works. */}
        {!isToday && (
          <Text style={[fontStyle.fontSizeExtraSmall, styles.back]}>{t.backToToday}</Text>
        )}
      </Pressable>

      <Arrow
        icon={icons.forward}
        label={t.nextDay}
        disabled={!canGoForward}
        onPress={() => shift(1)}
      />
    </View>
  );
}

function Arrow({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={({ pressed }) => [
        BaseStyle.alignJustifyCenter,
        styles.arrow,
        pressed && styles.pressed,
      ]}>
      <AppIcon name={icon} size={20} color={disabled ? textFaint : textDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: cardBg,
    borderRadius: 16,
    paddingVertical: spacings.normalx,
    paddingHorizontal: spacings.normalx,
    shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  embedded: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  arrow: { width: wp(10), height: wp(10) },
  pressed: { opacity: 0.6 },
  label: { color: textDark },
  back: { color: accentColor, marginTop: spacings.xxsmall },
});
