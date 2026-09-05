import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon, Card, CustomButton, CustomTextInput, icons } from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  appBg,
  dangerColor,
  dangerSoft,
  textFaint,
  textMuted,
} from '../../constans/Color';
import { repairs as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import type { InspectStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<InspectStackParams, 'RaiseWorkOrder'>;

/**
 * Asking the workshop for a job on this truck.
 *
 * Two fields and nothing else. Everything a work order eventually carries —
 * labour hours, parts, cost, which mechanic takes it — is the workshop's to
 * fill in, and the insert policy refuses the row if any of it arrives
 * pre-filled. A driver is saying what needs doing, not booking it in.
 *
 * This is separate from reporting a fault. A fault is a finding about the
 * truck's condition and goes on the compliance record; this is a request for
 * work, which is a different thing and sometimes has no fault behind it at all
 * — a service due, a spare key, a bracket for the phone mount.
 */
export function RaiseWorkOrderScreen({ navigation }: Props) {
  const { state } = useAuth();
  const profile = state.status === 'signedIn' ? state.profile : null;
  const { vehicle } = useShift();

  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [titleError, setTitleError] = useState<string>();
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!profile) return;
    if (!vehicle) {
      setFailure(t.noVehicle);
      return;
    }
    if (!title.trim()) {
      setTitleError(t.titleRequired);
      return;
    }

    setSending(true);
    setFailure(null);
    try {
      await api.raiseWorkOrder(profile.orgId, profile.driverId, vehicle.vehicleId, {
        title,
        description: detail,
        // The tap, not the write. See reportPosition and recordDutyEvent.
        openedAt: new Date().toISOString(),
      });
      navigation.goBack();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : t.raiseFailed);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Text style={[fontStyle.fontSizeSmall2x, styles.hint]}>{t.raiseHint}</Text>
        <Text style={[fontStyle.fontSizeSmall2x, styles.truck]}>
          {vehicle ? vehicle.name : t.noVehicle}
        </Text>

        <Card style={styles.card}>
          <CustomTextInput
            label={t.raiseTitle}
            value={title}
            onChangeText={next => {
              setTitle(next);
              setTitleError(undefined);
            }}
            placeholder={t.raiseTitlePlaceholder}
            autoCapitalize="sentences"
            error={titleError}
            required
          />
          <CustomTextInput
            label={t.raiseDetail}
            value={detail}
            onChangeText={setDetail}
            placeholder={t.raiseDetailPlaceholder}
            autoCapitalize="sentences"
            multiline
          />
        </Card>

        {Boolean(failure) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{failure}</Text>
          </View>
        )}

        <CustomButton
          title={t.raiseSubmit}
          icon={icons.send}
          loading={sending}
          disabled={!vehicle}
          style={styles.submit}
          onPress={() => {
            send().catch(() => {});
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.ExtraLarge },
  hint: { color: textMuted, paddingTop: spacings.large, lineHeight: hp(2.5) },
  truck: { color: textFaint, marginTop: spacings.normal },
  card: { marginTop: spacings.large },
  error: {
    backgroundColor: dangerSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
  submit: { marginTop: spacings.xxLarge },
});
