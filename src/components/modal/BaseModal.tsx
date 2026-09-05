import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { BaseStyle } from '../../constans/Style';
import { spacings } from '../../constans/Fonts';
import { cardBg, shadowColor } from '../../constans/Color';
import { widthPercentageToDP as wp } from '../../utils';

/**
 * The shell every modal in the app sits in.
 *
 * One place for the backdrop, the card and the dismiss behaviour, so a
 * confirmation and a success message cannot drift apart visually.
 *
 * The card scales up from 0.92 as it fades in. Small, and only on entry —
 * animating the exit as well makes a confirmation feel slow to answer.
 *
 * `dismissable` is off by default. A question should not be answerable by
 * tapping next to it: a stray tap while the phone sits in a cradle would count
 * as "no", which for a confirmation is a silent cancel.
 */
export function BaseModal({
  visible,
  onClose,
  dismissable = false,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  dismissable?: boolean;
  children: React.ReactNode;
}) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      enter.setValue(0);
      return;
    }
    Animated.spring(enter, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 4,
    }).start();
  }, [visible, enter]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismissable ? onClose : undefined}>
      <View style={[BaseStyle.flex, BaseStyle.alignJustifyCenter, styles.backdrop]}>
        {dismissable && (
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: enter,
              transform: [
                { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
              ],
            },
          ]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15,20,30,0.45)',
    paddingHorizontal: spacings.xxLarge,
  },
  card: {
    backgroundColor: cardBg,
    width: wp(86),
    maxWidth: wp(100),
    padding: spacings.xxLarge,
    borderRadius: 20,
    shadowColor,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
});
