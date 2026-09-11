import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { borderColor } from '../constans/Color';

/**
 * A ring made of one or more arcs, drawn head to tail clockwise from the top.
 *
 * ---------------------------------------------------------------------------
 * Why a list and not a single fraction
 * ---------------------------------------------------------------------------
 * A clock that has been overrun has two things to say, not one: how much was
 * allowed, and how much was taken beyond it. With a single fraction the ring
 * could only show one of them — and it showed neither, because "hours left" is
 * zero once a limit is passed, so the arc vanished and an overrun clock drew
 * an empty circle.
 *
 * Given both, the ring becomes the whole of what the driver actually did: an
 * eight-hour limit with nine and a half driven is a full circle, of which
 * eight hours' worth is the status colour and the last hour and a half is red.
 * The split is the point — it shows where the line was crossed rather than
 * only that it was.
 *
 * ---------------------------------------------------------------------------
 * Why SVG
 * ---------------------------------------------------------------------------
 * This was built from plain views to avoid a native module, on the same
 * grounds as the duty graph. The arithmetic came out right and it still could
 * not be made to look right: a ring built from borders has ends MITRED at 45
 * degrees, so an arc's terminus is always cut on a slant, and at a high
 * percentage the last two degrees of grey read as a chipped ring rather than
 * as two minutes. A stroked circle has a real round cap.
 */

export type Arc = {
  /** Share of the whole ring, 0 to 1. */
  portion: number;
  color: string;
};

export function ProgressRing({
  size,
  stroke,
  arcs,
  track = borderColor,
  children,
}: {
  size: number;
  stroke: number;
  arcs: Arc[];
  track?: string;
  children?: React.ReactNode;
}) {
  /* Inset by half the stroke, or the line is clipped by the viewport. */
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const drawn = arcs.filter(a => a.portion > 0);
  const total = drawn.reduce((sum, a) => sum + a.portion, 0);
  /* A ring that comes to a whole turn has no gap, so no cap should be round —
     a round cap on a closed circle overlaps itself and shows as a bump. */
  const closed = total >= 0.999;

  let start = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />

        {drawn.map((arc, i) => {
          const portion = Math.min(arc.portion, 1 - start);
          const at = start;
          start += portion;
          if (portion <= 0) return null;

          return (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={arc.color}
              strokeWidth={stroke}
              fill="none"
              /*
               * One dash the length of this arc, then a gap long enough that
               * it never repeats. The negative offset walks the dash round to
               * where this arc begins.
               */
              strokeDasharray={`${circumference * portion} ${circumference}`}
              strokeDashoffset={-circumference * at}
              strokeLinecap={closed ? 'butt' : 'round'}
              /* A stroke starts at three o'clock; a dial starts at twelve. */
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
      </Svg>

      {/*
        The figure, over the ring rather than inside the Svg.

        Anything inside an <Svg> has to be an SVG element — a React Native
        <Text> put there renders as nothing at all, silently, which is how the
        first attempt at this lost every figure on the strip.
      */}
      <View style={styles.middle} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  middle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
