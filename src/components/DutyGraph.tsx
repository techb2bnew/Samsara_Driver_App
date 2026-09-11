import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import {
  borderColor,
  cardBg,
  cardBgSoft,
  shadowColor,
  dutyDrivingColor,
  dutyOffColor,
  dutyOnDutyColor,
  dutySleeperColor,
  textDark,
  textFaint,
  textMuted,
} from '../constans/Color';
import { duty as dutyText } from '../constans/Constants';
import {
  BANDS,
  MINUTES_IN_DAY,
  formatClock,
  formatClockPadded,
  totals,
  type Band,
  type Segment,
} from '../helpers/duty';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';

/**
 * Row height. Four of these plus the two rulers is the whole graph.
 *
 * Raised from 4.2%. At that size four rows came to about a sixth of the screen
 * and the stepped line had barely more vertical travel than its own thickness
 * — the thing the format exists to show, a status CHANGING, was the hardest
 * part to see. The risers now read as real steps.
 */
const ROW = hp(5.8);
/** A segment narrower than this has no room for its own figure. */
const LABEL_MIN_MINUTES = 75;

/*
 * The stepped line's weight.
 *
 * Scaled with the graph rather than left at 2px: a taller grid with the same
 * hairline through it looks thinner than it did, not the same. Hour lines stay
 * hairline — they are the paper, not the ink.
 */
const LINE = wp(0.7);

/* The tooltip. A fixed width so it can be clamped inside the lane without
   measuring it first. */
const TIP_WIDTH = wp(44);

/** 12, 1…11, 12, 1…11, 12 — midnight to midnight, the way a paper log reads. */
const HOURS = Array.from({ length: 25 }, (_, i) => {
  const h = i % 12;
  return h === 0 ? '12' : String(h);
});

const percent = (minutes: number) => `${(minutes / MINUTES_IN_DAY) * 100}%`;

/**
 * The colour of each status, taken from the buttons the driver taps.
 *
 * The Duty screen's own comment says "the status buttons are colour-coded to
 * the graph rows", and that was not true: the buttons had these four colours
 * and the graph drew every stroke in the same near-black. So the run a driver
 * looks at after pressing Driving was the same colour as the one they left.
 *
 * Deliberately the SAME four constants rather than a paler set for the graph.
 * A driver checking the line against the button they just pressed is matching
 * colours by eye, and two greens that nearly agree are worse than one.
 */
const BAND_COLOR: Record<Band, string> = {
  off: dutyOffColor,
  sleeper: dutySleeperColor,
  driving: dutyDrivingColor,
  on_duty: dutyOnDutyColor,
};

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

  /** What the driver tapped. Null when nothing is open. */
  const [picked, setPicked] = useState<{ band: Band; segment: Segment | null } | null>(null);
  /*
   * The lane's width in pixels, needed to turn a touch into a minute of the
   * day. Measured rather than assumed, because the lane is what is left after
   * the label and total columns and those are percentages of the screen.
   */
  const [laneWidth, setLaneWidth] = useState(0);

  function onLayout(event: LayoutChangeEvent) {
    setLaneWidth(event.nativeEvent.layout.width);
  }

  /*
   * Which block was tapped.
   *
   * Both coordinates are used, and the row matters more than the x. A
   * five-minute stop is 0.35% of a 24-hour lane — about one pixel — so
   * hit-testing on x alone would make the blocks a driver most wants to read
   * the only ones they cannot touch.
   *
   * So: the row decides the status, and then the NEAREST block in that row
   * wins. Tapping anywhere along the off-duty row near a short stop selects
   * that stop, which is what somebody pointing at it means.
   */
  function onTap(event: GestureResponderEvent) {
    if (laneWidth <= 0) return;

    const { locationX, locationY } = event.nativeEvent;
    const row = Math.min(BANDS.length - 1, Math.max(0, Math.floor(locationY / ROW)));
    const band = BANDS[row];
    const minute = (locationX / laneWidth) * MINUTES_IN_DAY;

    const inBand = ordered.filter(s => s.band === band);
    if (inBand.length === 0) {
      setPicked({ band, segment: null });
      return;
    }

    /* Distance to the block, which is zero for the one the touch is inside. */
    const nearest = inBand.reduce((best, s) => {
      const gap = Math.max(s.from - minute, minute - s.to, 0);
      const bestGap = Math.max(best.from - minute, minute - best.to, 0);
      return gap < bestGap ? s : best;
    });

    /* Tapping the same block again closes it. */
    setPicked(current =>
      current?.segment?.from === nearest.from && current.segment.band === band
        ? null
        : { band, segment: nearest },
    );
  }

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
            <Text style={[fontStyle.fontSizeExtraSmall, styles.bandLabel]} numberOfLines={1}>
              {dutyText.status[band].toUpperCase()}
            </Text>

            <View style={styles.lane}>
              <Ticks />
            </View>

            <Text
              style={[
                fontStyle.fontSizeSmall,
                fontStyle.fontWeightMedium,
                styles.bandTotal,
              ]}>
              {formatClockPadded(byBand[band])}
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
                      backgroundColor: BAND_COLOR[segment.band],
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
                        /*
                         * The status being ENTERED, not the one being left. A
                         * riser is the moment of a change, and what a driver
                         * reads off it is what they went ON to — the status
                         * they left is already drawn to its left.
                         */
                        backgroundColor: BAND_COLOR[segment.band],
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
                      fontStyle.fontSizeExtraSmall,
                      fontStyle.fontWeightMedium,
                      styles.blockLabel,
                      {
                        /*
                         * Centred on the block: a percentage puts its LEFT
                         * edge at the midpoint, and the negative margin pulls
                         * it back by half its own width.
                         *
                         * This used to subtract 30 from the minute figure
                         * instead — offsetting in minutes to stand in for a
                         * pixel width. Half an hour of a 24-hour day is about
                         * 2% of the lane, nowhere near half a label, so every
                         * figure sat right of where it belonged.
                         */
                        left: percent(segment.from + width / 2),
                        marginLeft: -BLOCK_LABEL_WIDTH / 2,
                        top: row * ROW + (row < 2 ? ROW / 2 + 1 : 2),
                      },
                    ]}>
                    {formatClock(width)}
                  </Text>
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/*
          The touch layer, over the drawing and under nothing.

          Separate from the overlay above, which stays pointerEvents="none" —
          the strokes are positioned by percentage and overlap each other, so
          making them touchable would mean the topmost stroke swallowing taps
          meant for the row.
        */}
        <Pressable style={styles.overlay} onPress={onTap} onLayout={onLayout} />

        {picked && (
          <View style={styles.tipLayer} pointerEvents="box-none">
            <Tip
              band={picked.band}
              segment={picked.segment}
              dayTotal={byBand[picked.band]}
              row={rowOf(picked.band)}
              laneWidth={laneWidth}
              onClose={() => setPicked(null)}
            />
          </View>
        )}
      </View>

      <HourRuler />
    </View>
  );
}

/**
 * What a tapped block says.
 *
 * Three lines, in the order somebody asks them: which status, when, and how
 * long. The day's total for that status comes last, and it is the sum of EVERY
 * block of that status — a driver tapping the third off-duty stop of the
 * morning is usually asking how much off duty they have had altogether.
 */
function Tip({
  band,
  segment,
  dayTotal,
  row,
  laneWidth,
  onClose,
}: {
  band: Band;
  /** Null when the tapped row has no time in it at all. */
  segment: Segment | null;
  dayTotal: number;
  row: number;
  laneWidth: number;
  onClose: () => void;
}) {
  const t = dutyText.graphTip;

  /*
   * Centred on the block and then clamped inside the lane, so a block at
   * either end of the day does not push the tip off the edge.
   */
  const mid = segment
    ? ((segment.from + segment.to) / 2 / MINUTES_IN_DAY) * laneWidth
    : laneWidth / 2;
  const left = Math.min(Math.max(0, mid - TIP_WIDTH / 2), Math.max(0, laneWidth - TIP_WIDTH));

  /*
   * Below the top two rows and above the bottom two, so it never covers the
   * row that was tapped. `bottom` for the upper case because the tip's height
   * depends on its text and this way nothing has to measure it.
   */
  const place =
    row < 2
      ? { top: (row + 1) * ROW + hp(0.4) }
      : { bottom: (BANDS.length - row) * ROW + hp(0.4) };

  return (
    <Pressable
      onPress={onClose}
      accessibilityLabel={t.close}
      style={[styles.tip, { left, width: TIP_WIDTH }, place]}>
      <Text
        style={[
          fontStyle.fontSizeSmall,
          fontStyle.fontWeightMedium,
          { color: BAND_COLOR[band] },
        ]}>
        {dutyText.status[band]}
      </Text>

      {segment ? (
        <>
          <Text style={[fontStyle.fontSizeExtraSmall, styles.tipSpan]}>
            {t.span(formatClock(segment.from), formatClock(segment.to))}
          </Text>
          <View style={styles.tipRow}>
            <Text style={[fontStyle.fontSizeExtraSmall, styles.tipKey]}>{t.block}</Text>
            <Text
              style={[
                fontStyle.fontSizeExtraSmall,
                fontStyle.fontWeightMedium,
                styles.tipValue,
              ]}>
              {formatClock(segment.to - segment.from)}
            </Text>
          </View>
        </>
      ) : (
        <Text style={[fontStyle.fontSizeExtraSmall, styles.tipSpan]}>{t.none}</Text>
      )}

      <View style={styles.tipRow}>
        <Text style={[fontStyle.fontSizeExtraSmall, styles.tipKey]}>{t.dayTotal}</Text>
        <Text
          style={[
            fontStyle.fontSizeExtraSmall,
            fontStyle.fontWeightMedium,
            styles.tipValue,
          ]}>
          {formatClock(dayTotal)}
        </Text>
      </View>
    </Pressable>
  );
}

/** Hour numbers, aligned to the lane between the label and total columns. */
function HourRuler() {
  return (
    <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.ruler]}>
      <View style={styles.rulerSpacerLeft} />
      <View style={[BaseStyle.flex, BaseStyle.flexDirectionRow, BaseStyle.justifyContentSpaceBetween]}>
        {HOURS.map((hour, i) => (
          <Text key={i} style={[fontStyle.fontSizeExtraSmall, styles.rulerText]}>
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
const TOTAL_WIDTH = wp(10);
/* The figure sits centred on its block, so its own width is half the offset. */
const BLOCK_LABEL_WIDTH = wp(16);

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
  tipLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: LABEL_WIDTH,
    right: TOTAL_WIDTH,
  },
  tip: {
    position: 'absolute',
    backgroundColor: cardBg,
    borderRadius: wp(2),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor,
    paddingHorizontal: spacings.small,
    paddingVertical: spacings.xsmall,
    /* Lifted off the grid it covers, so the hour lines behind it do not read
       as part of the tip. */
    shadowColor,
    shadowOpacity: 0.18,
    shadowRadius: wp(2),
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tipSpan: { color: textMuted, marginTop: spacings.xxsmall },
  tipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacings.xxsmall,
  },
  tipKey: { color: textFaint },
  tipValue: { color: textDark },

  /* Colour comes from the band at every use site, so none is set here. */
  stroke: {
    position: 'absolute',
    height: LINE,
  },
  riser: {
    position: 'absolute',
    width: LINE,
  },
  blockLabel: {
    position: 'absolute',
    width: BLOCK_LABEL_WIDTH,
    textAlign: 'center',
    color: textDark,
  },
});
