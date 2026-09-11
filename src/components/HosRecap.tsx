import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import {
  cardBg,
  dangerColor,
  dutyDrivingColor,
  dutyOffColor,
  dutyOnDutyColor,
  dutySleeperColor,
  ringTrack,
  shadowColor,
  textDark,
  textFaint,
  textMuted,
  warnColor,
} from '../constans/Color';
import { common, duty as t } from '../constans/Constants';
import { formatClock } from '../helpers/duty';
import type { Limits, Recap } from '../helpers/hosLimits';
import { ProgressRing, type Arc } from './ProgressRing';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from '../utils';

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
/**
 * How the strip lays itself out for the number of clocks it has.
 *
 * A fleet on a legal regime has three or four; one on its own rule book can
 * have six, and six across a phone would be too small to read. So four or
 * fewer go in one row, and more than that in rows of three — which also keeps
 * six as two even rows rather than five and a stray.
 */
function layout(count: number): { perRow: number; ring: number } {
  const perRow = count > 4 ? 3 : Math.max(1, count);
  return { perRow, ring: perRow >= 4 ? wp(19) : wp(22) };
}

const RING_STROKE = wp(1.7);

/*
 * The last half hour.
 *
 * An absolute figure, not a fraction: thirty minutes left is thirty minutes
 * whether the clock started at eight hours or at seventy, and a percentage
 * would warn a driver two hours early on the cycle and five minutes early on
 * the break.
 */
const WARN_AT = 30;

/**
 * The ring carries WHICH clock it is; the figure inside carries how urgent.
 *
 * ---------------------------------------------------------------------------
 * Why they are split
 * ---------------------------------------------------------------------------
 * Both jobs used to be the ring's, and the two cannot share it. Colouring each
 * ring to match the button it belongs to is worth having — a driver matching
 * the Rest ring to the Sleeper button does it by eye — but the Load ring's
 * button is amber, and amber was also "running out". A Load clock with twenty
 * minutes left would have looked exactly like one with three hours.
 *
 * So the ring keeps the status colour and the figure warns: black, then amber
 * for the last half hour, then red once the limit is past. A clock that has
 * been overrun says so with a red arc of its own — see the arcs below.
 */
function figureColor(left: number | null): string {
  if (left === null) return textMuted;
  if (left <= 0) return dangerColor;
  if (left <= WARN_AT) return warnColor;
  return textDark;
}

export function HosRecap({
  recap,
  /*
   * Needed for the rings, not the figures.
   *
   * A recap only carries what is LEFT, and a ring is a fraction — so the limit
   * it is left out of has to come from somewhere. Null when no rule book is
   * chosen, which is also when every figure is a dash.
   */
  limits,
  /*
   * True when the day on screen has finished.
   *
   * Only the heading changes. "Hours left" on a day that is over reads as an
   * allowance the driver could still spend, when what it actually says is how
   * close they came before the day ended — the same figure answering a
   * different question, and worth a different word.
   */
  past = false,
}: {
  recap: Recap;
  limits: Limits | null;
  past?: boolean;
}) {
  /*
   * Label, what is left, and what it is left out of.
   *
   * Rest and Load only appear on a rule book that has those rules, which is a
   * fleet's own — so a fleet on FMCSA or the EU regulation still sees the four
   * clocks it had and nothing it has to ask about.
   */
  /*
   * Label, what is left, what it is left out of, and the colour of the button
   * it belongs to.
   *
   * Cycle is the one with no colour of its own: it spans eight days and
   * belongs to no single status, so it takes the plain ink rather than
   * borrowing a status it is not.
   */
  const cells: Array<[string, number | null, number | null, string, number]> = [
    [t.recap.onDuty, recap.onDuty, limits?.dutyWindow ?? null, dutyOnDutyColor, recap.over.onDuty ?? 0],
    [t.recap.driving, recap.driving, limits?.dailyDriving ?? null, dutyDrivingColor, recap.over.driving ?? 0],
    [t.recap.breakIn, recap.breakIn, limits?.drivingBeforeBreak ?? null, dutyOffColor, recap.over.breakIn ?? 0],
    [t.recap.rest, recap.restOwed, limits?.dailyRest ?? null, dutySleeperColor, 0],
    [t.recap.load, recap.loadLeft, limits?.maxOnDuty ?? null, dutyOnDutyColor, recap.over.loadLeft ?? 0],
    [t.recap.cycle, recap.cycle, limits?.cycle ?? null, textDark, recap.over.cycle ?? 0],
  ];

  /*
   * All four null means no rule book has been chosen. Some null means the rule
   * book has no such rule — EU has no duty-window limit at all, so that clock
   * cannot have a figure however the day went.
   */
  const known = cells.some(([, value]) => value !== null);

  /*
   * A cell that can never have a value is dropped rather than shown as a dash.
   *
   * On EU that was one dash sitting among three figures with nothing to say
   * why, and a driver reading it has no way to tell "there is no such rule"
   * from "this is broken". With no rule book at all every cell is a dash and
   * the note underneath explains it, which is a different thing and reads as
   * one.
   */
  const shown = known ? cells.filter(([, value]) => value !== null) : cells;
  const { perRow, ring } = layout(shown.length);

  return (
    <View style={styles.card}>
      <Text style={[fontStyle.fontSizeExtraSmall, fontStyle.fontWeightMedium, styles.kicker]}>
        {(past ? t.recap.hoursLeftPast : t.recap.hoursLeft).toUpperCase()}
      </Text>
      {/*
        Wrapped and centred.

        Five clocks make a row of three and a row of two, and neither
        space-between nor a left edge handles that: spreading pushes the last
        two to opposite corners, and starting from the left leaves a hole where
        a sixth ring would be. Centring each row puts that gap on both sides
        instead of all on one, which reads as a deliberate shape rather than a
        row that ran out.
      */}
      <View
        style={[
          BaseStyle.flexDirectionRow,
          BaseStyle.flexWrap,
          BaseStyle.justifyContentCenter,
        ]}>
        {shown.map(([label, value, limit, status, over]) => {
          /*
           * An empty ring when the figure is unknown, so the strip keeps its
           * shape instead of collapsing into a row of labels. There is nothing
           * to fill it with and a dash says so.
           */
          /*
           * What the ring is a picture OF changes once a limit is passed.
           *
           * Inside the limit it is the allowance: the arc is what is left of
           * it, draining as the day goes. Past the limit it becomes the time
           * actually spent — eight hours allowed and nine and a half driven
           * makes a full ring, of which eight hours' worth is the status
           * colour and the last hour and a half is red.
           *
           * That way the ring never collapses to nothing at the moment it
           * matters most, and the split says where the line was crossed rather
           * than only that it was.
           */
          const arcs: Arc[] =
            over > 0 && limit
              ? [
                  { portion: limit / (limit + over), color: status },
                  { portion: over / (limit + over), color: dangerColor },
                ]
              : [
                  {
                    portion: value !== null && limit && limit > 0 ? value / limit : 0,
                    color: value === null ? textMuted : status,
                  },
                ];

          return (
            <View
              key={label}
              style={[
                BaseStyle.alignItemsCenter,
                styles.cell,
                { width: `${100 / perRow}%` },
              ]}>
              <Text
                style={[fontStyle.fontSizeExtraExtraSmall, styles.label]}
                numberOfLines={1}>
                {label}
              </Text>
              <ProgressRing size={ring} stroke={RING_STROKE} arcs={arcs} track={ringTrack}>
                {/*
                  Past the limit the figure counts UP and wears a plus, because
                  "0:00 left" is true and useless — it is the same thing a
                  clock says a second before it runs out and an hour after.
                */}
                <Text
                  style={[
                    fontStyle.fontSizeSmall,
                    fontStyle.fontWeightMedium,
                    styles.value,
                    { color: over > 0 ? dangerColor : figureColor(value) },
                  ]}>
                  {value === null
                    ? common.dash
                    : over > 0
                      ? t.recap.overBy(formatClock(over))
                      : formatClock(value)}
                </Text>
              </ProgressRing>

              {/* What the ring is a fraction of. */}
              <Text style={[fontStyle.fontSizeExtraExtraSmall, styles.total]} numberOfLines={1}>
                {limit === null ? ' ' : t.recap.ofTotal(formatClock(limit))}
              </Text>
            </View>
          );
        })}
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
  cell: { paddingVertical: spacings.xsmall },
  label: { color: textMuted, marginBottom: spacings.small },
  value: { color: textDark, fontVariant: ['tabular-nums'] },
  total: { color: textFaint, marginTop: spacings.xsmall },
  note: {
    color: textMuted,
    marginTop: spacings.normal,
    lineHeight: hp(2.1),
  },
});
