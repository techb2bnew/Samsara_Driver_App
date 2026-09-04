import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import {
  borderColor,
  cardBg,
  cardBgSoft,
  textDark,
  textFaint,
  textMuted,
} from '../constans/Color';
import { duty as dutyText } from '../constans/Constants';
import {
  BANDS,
  MINUTES_IN_DAY,
  formatHours,
  totals,
  type Band,
  type Segment,
} from '../helpers/duty';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

/** Row height. Four of these plus the two rulers is the whole graph. */
const ROW = hp(4.2);
/** A segment narrower than this has no room for its own figure. */
const LABEL_MIN_MINUTES = 75;

/** 12, 1…11, 12, 1…11, 12 — midnight to midnight, the way a paper log reads. */
const HOURS = Array.from({ length: 25 }, (_, i) => {
  const h = i % 12;
  return h === 0 ? '12' : String(h);
});

const percent = (minutes: number) => `${(minutes / MINUTES_IN_DAY) * 100}%`;

/**
 * The 24-hour duty log, drawn the way an ELD draws it.
 *
 * Four rows, a stepped line moving between them at each status change, hour
 * rulers top and bottom, and the day's total per row down the right.
 *
 * This is not a chart choice. It is the format on every paper log book and
 * every ELD screen, which means a driver can already read it and a roadside
 * inspector can check it without being taught anything. A prettier bar chart
 * would be worse at both.
 *
 * Built from positioned views rather than SVG so the app needs no extra native
 * module — the driver has already had to rebuild twice for maps and icons.
 *
 * ---------------------------------------------------------------------------
 * Why a stepped line and not filled bars
 * ---------------------------------------------------------------------------
 * The line is continuous: it shows that the day is a single unbroken sequence
 * of statuses, and the vertical jumps are the moments something changed.
 * Filled bars per row lose that — they read as four independent tracks, and a
 * gap in one of them is indistinguishable from off-duty time.
 */
export function DutyGraph({ segments }: { segments: Segment[] }) {
  const byBand = totals(segments);
  const ordered = [...segments].sort((a, b) => a.from - b.from);
  const rowOf = (band: Band) => BANDS.indexOf(band);

  return (
    <View>
      <HourRuler />

      <View style={styles.grid}>
        {/* Bands, bottom-bordered so the four rows are separated by real lines
            rather than by spacing that a screenshot would lose. */}
        {BANDS.map((band, i) => (
          <View
            key={band}
            style={[
              BaseStyle.flexDirectionRow,
              BaseStyle.alignItemsCenter,
              styles.band,
              i === BANDS.length - 1 && styles.lastBand,
            ]}>
            <Text style={[fontStyle.fontSizeExtraExtraSmall, styles.bandLabel]} numberOfLines={1}>
              {dutyText.status[band].toUpperCase()}
            </Text>

            <View style={styles.lane}>
              <Ticks />
            </View>

            <Text
              style={[
                fontStyle.fontSizeExtraSmall,
                fontStyle.fontWeightMedium,
                styles.bandTotal,
              ]}>
              {formatHours(byBand[band])}
            </Text>
          </View>
        ))}

        {/* The line, over the grid. Absolute so it can cross row boundaries —
            a status change is one vertical stroke through two bands. */}
        <View style={styles.overlay} pointerEvents="none">
          {ordered.map((segment, i) => {
            const row = rowOf(segment.band);
            const width = segment.to - segment.from;
            const previous = i > 0 ? ordered[i - 1] : null;

            return (
              <React.Fragment key={`${segment.from}-${segment.band}`}>
                {/* The horizontal run, on this band's centre line. */}
                <View
                  style={[
                    styles.stroke,
                    {
                      left: percent(segment.from),
                      width: percent(width),
                      top: row * ROW + ROW / 2,
                    },
                  ]}
                />

                {/* The riser, joining the previous status to this one. */}
                {previous && previous.band !== segment.band && (
                  <View
                    style={[
                      styles.riser,
                      {
                        left: percent(segment.from),
                        top:
                          Math.min(rowOf(previous.band), row) * ROW + ROW / 2,
                        height: Math.abs(rowOf(previous.band) - row) * ROW,
                      },
                    ]}
                  />
                )}

                {/* The block's own figure, when it is wide enough to hold one.
                    Below the line for the top two rows and above it for the
                    bottom two, so it never sits on the row divider. */}
                {width >= LABEL_MIN_MINUTES && (
                  <Text
                    style={[
                      fontStyle.fontSizeExtraExtraSmall,
                      fontStyle.fontWeightMedium,
                      styles.blockLabel,
                      {
                        left: percent(segment.from + width / 2 - 30),
                        top: row * ROW + (row < 2 ? ROW / 2 + 1 : 2),
                      },
                    ]}>
                    {formatHours(width)}
                  </Text>
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      <HourRuler />
    </View>
  );
}

/** Hour numbers, aligned to the lane between the label and total columns. */
function HourRuler() {
  return (
    <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.ruler]}>
      <View style={styles.rulerSpacerLeft} />
      <View style={[BaseStyle.flex, BaseStyle.flexDirectionRow, BaseStyle.justifyContentSpaceBetween]}>
        {HOURS.map((hour, i) => (
          <Text key={i} style={[fontStyle.fontSizeExtraExtraSmall, styles.rulerText]}>
            {hour}
          </Text>
        ))}
      </View>
      <View style={styles.rulerSpacerRight} />
    </View>
  );
}

/**
 * Hour lines and quarter-hour ticks.
 *
 * The quarter ticks are what make the grid readable at a glance: a block that
 * starts a quarter past reads as a quarter past instead of "somewhere in that
 * hour", which is the precision a log is kept to.
 */
function Ticks() {
  return (
    <>
      {Array.from({ length: 24 }, (_, hour) => (
        <React.Fragment key={hour}>
          <View style={[styles.hourLine, { left: `${(hour / 24) * 100}%` }]} />
          {[1, 2, 3].map(quarter => (
            <View
              key={quarter}
              style={[
                styles.quarterTick,
                { left: `${((hour + quarter / 4) / 24) * 100}%` },
              ]}
            />
          ))}
        </React.Fragment>
      ))}
    </>
  );
}

const LABEL_WIDTH = wp(15);
const TOTAL_WIDTH = wp(9);

const styles = StyleSheet.create({
  grid: { position: 'relative' },

  ruler: { paddingVertical: spacings.xxsmall },
  rulerSpacerLeft: { width: LABEL_WIDTH },
  rulerSpacerRight: { width: TOTAL_WIDTH },
  rulerText: { color: textFaint },

  band: {
    height: ROW,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: borderColor,
  },
  lastBand: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: borderColor,
  },
  bandLabel: { color: textMuted, width: LABEL_WIDTH },
  lane: {
    flex: 1,
    height: '100%',
    backgroundColor: cardBg,
    position: 'relative',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor,
  },
  bandTotal: { color: textDark, width: TOTAL_WIDTH, textAlign: 'right' },

  hourLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: borderColor,
  },
  quarterTick: {
    position: 'absolute',
    top: 0,
    height: '28%',
    width: StyleSheet.hairlineWidth,
    backgroundColor: cardBgSoft,
  },

  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: LABEL_WIDTH,
    right: TOTAL_WIDTH,
  },
  stroke: {
    position: 'absolute',
    height: 2,
    backgroundColor: textDark,
  },
  riser: {
    position: 'absolute',
    width: 2,
    backgroundColor: textDark,
  },
  blockLabel: {
    position: 'absolute',
    width: 60,
    textAlign: 'center',
    color: textDark,
  },
});
