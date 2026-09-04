import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { BaseModal } from './BaseModal';
import { CustomButton } from '../CustomButton';
import { AppIcon, icons } from '../AppIcon';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import { okColor, okSoft, textBody, textDark } from '../../constans/Color';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

/**
 * Confirms something worked, when the next screen would not make it obvious.
 *
 * A changed password is the case this exists for. Everything routine uses a
 * toast — a modal for every success trains people to dismiss modals without
 * reading them, and then the one that mattered gets dismissed too.
 *
 * The tick lands a beat after the card, which is what makes it feel like a
 * result rather than just another dialog.
 */
export function SuccessModal({
  visible,
  title,
  message,
  actionLabel,
  onAction,
}: {
  visible: boolean;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      pop.setValue(0);
      return;
    }
    Animated.sequence([
      Animated.delay(120),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }),
    ]).start();
  }, [visible, pop]);

  return (
    <BaseModal visible={visible} onClose={onAction}>
      <Animated.View
        style={[
          BaseStyle.alignSelfCenter,
          BaseStyle.alignJustifyCenter,
          styles.badge,
          { transform: [{ scale: pop }] },
        ]}>
        <AppIcon name={icons.checkCircle} size={40} color={okColor} />
      </Animated.View>

      <Text
        style={[
          fontStyle.fontSizeLarge,
          fontStyle.fontWeightMedium1x,
          BaseStyle.textAlign,
          styles.title,
        ]}>
        {title}
      </Text>
      <Text style={[fontStyle.fontSizeNormal1x, BaseStyle.textAlign, styles.message]}>
        {message}
      </Text>

      <CustomButton title={actionLabel} onPress={onAction} />
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    backgroundColor: okSoft,
    marginBottom: spacings.xLarge,
  },
  title: { color: textDark, marginBottom: spacings.normalx },
  message: { color: textBody, lineHeight: hp(2.9), marginBottom: spacings.xxxLarge },
});
