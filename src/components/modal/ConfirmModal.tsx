import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BaseModal } from './BaseModal';
import { CustomButton } from '../CustomButton';
import { AppIcon } from '../AppIcon';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  accentSoft,
  dangerColor,
  dangerSoft,
  textBody,
  textDark,
} from '../../constans/Color';
import { common } from '../../constans/Constants';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';

/**
 * Asks before something that cannot simply be undone.
 *
 * The confirm button carries the verb — "Sign out", not "OK" — because a driver
 * dismissing a stack of prompts reads the button, not the question.
 *
 * Cancel sits below confirm rather than beside it: two buttons side by side at
 * thumb width in a moving cab is how the wrong one gets pressed.
 */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = common.cancel,
  icon,
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const danger = tone === 'danger';

  return (
    <BaseModal visible={visible} onClose={onCancel}>
      {Boolean(icon) && (
        <View
          style={[
            BaseStyle.alignSelfCenter,
            BaseStyle.alignJustifyCenter,
            styles.badge,
            { backgroundColor: danger ? dangerSoft : accentSoft },
          ]}>
          <AppIcon name={icon as string} size={26} color={danger ? dangerColor : accentColor} />
        </View>
      )}

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

      <CustomButton
        title={confirmLabel}
        variant={danger ? 'danger' : 'primary'}
        loading={loading}
        onPress={onConfirm}
      />
      <CustomButton
        title={cancelLabel}
        variant="outline"
        disabled={loading}
        onPress={onCancel}
        style={styles.cancel}
      />
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: wp(15),
    height: wp(15),
    borderRadius: wp(7.5),
    marginBottom: spacings.xLarge,
  },
  title: { color: textDark, marginBottom: spacings.normalx },
  message: { color: textBody, lineHeight: hp(2.9), marginBottom: spacings.xxLarge },
  cancel: { marginTop: spacings.normalx },
});
