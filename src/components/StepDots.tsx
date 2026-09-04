import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { BaseStyle } from '../constans/Style';
import { spacings } from '../constans/Fonts';
import { dotActiveColor, dotInactiveColor } from '../constans/Color';
import { widthPercentageToDP as wp } from '../utils';

/**
 * Where you are in a short sequence.
 *
 * The active dot stretches into a bar instead of just changing colour, and the
 * width is animated — the movement is what makes it read as progress along a
 * line rather than as one of three choices.
 */
export function StepDots({ count, active }: { count: number; active: number }) {
  return (
    <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignJustifyCenter]}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} on={i === active} />
      ))}
    </View>
  );
}

function Dot({ on }: { on: boolean }) {
  const grow = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(grow, {
      toValue: on ? 1 : 0,
      duration: 260,
      // Width cannot be driven natively, so this one runs on the JS thread.
      // It is three dots on an idle screen; the cost is nothing.
      useNativeDriver: false,
    }).start();
  }, [on, grow]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: grow.interpolate({ inputRange: [0, 1], outputRange: [wp(2), wp(7.5)] }),
          backgroundColor: on ? dotActiveColor : dotInactiveColor,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: { height: wp(2), borderRadius: wp(1), marginHorizontal: spacings.small },
});
