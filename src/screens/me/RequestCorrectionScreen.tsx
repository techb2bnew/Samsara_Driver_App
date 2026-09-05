import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppIcon,
  Card,
  CustomButton,
  CustomTextInput,
  EmptyState,
  icons,
} from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  accentSoft,
  appBg,
  cardBgSoft,
  dangerColor,
  dangerSoft,
  dutyDrivingColor,
  dutyOffColor,
  dutyOnDutyColor,
  dutySleeperColor,
  onAccent,
  textDark,
  textFaint,
  textMuted,
} from '../../constans/Color';
import { correction as t, duty } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { formatTime } from '../../helpers/duty';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import type { MeStackParams } from '../../navigation/types';

/*
 * Registered in two stacks, so the props are written against the one that owns
 * the params rather than being narrowed to either. Both declare the same
 * route, and the screen only reads eventId.
 */
type Props = NativeStackScreenProps<MeStackParams, 'RequestCorrection'>;

const CHOICES: Array<{ status: api.DutyStatus; label: string; color: string }> = [
  { status: 'off_duty', label: duty.status.off, color: dutyOffColor },
  { status: 'sleeper_berth', label: duty.status.sleeper, color: dutySleeperColor },
  { status: 'driving', label: duty.status.driving, color: dutyDrivingColor },
  { status: 'on_duty_not_driving', label: duty.status.on_duty, color: dutyOnDutyColor },
];

/**
 * Asking the office to change a recorded duty event.
 *
 * Nothing here edits the log. The request is written as a NEW event that
 * points at the original with edit_status 'pending', and the office either
 * approves it or does not — the driver's own record stays exactly as it was
 * recorded until somebody with authority decides otherwise. That is the whole
 * reason this screen is a request and not a form: a log a driver could edit is
 * a log no inspector would accept.
 *
 * The reason is required. The office is being asked to overwrite a legal
 * record and "because it is wrong" is not something they can approve.
 */
export function RequestCorrectionScreen({ route, navigation }: Props) {
  const eventId = route.params?.eventId;
  const { state } = useAuth();
  const profile = state.status === 'signedIn' ? state.profile : null;
  const { events, refresh } = useShift();

  const original = useMemo(
    () => events.find(e => e.id === eventId) ?? null,
    [events, eventId],
  );

  const [status, setStatus] = useState<api.DutyStatus | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!profile || !original || !status) return;
    if (!reason.trim()) {
      setReasonError(t.reasonRequired);
      return;
    }

    setSending(true);
    setFailure(null);
    try {
      /*
       * The ORIGINAL event's start time is sent back unchanged. This screen
       * challenges what the status was, not when it began — a driver arguing
       * about the time as well would be rewriting two things at once, and the
       * office would have nothing to compare the request against.
       */
      await api.requestCorrection(
        profile.orgId,
        profile.driverId,
        original.id,
        status,
        original.startedAt,
        reason,
      );
      await refresh();
      navigation.goBack();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : t.failed);
    } finally {
      setSending(false);
    }
  }

  if (!original) {
    return (
      <View style={[BaseStyle.flex, styles.ground]}>
        <View style={styles.body}>
          <EmptyState
            icon={icons.logbook}
            title={t.title}
            /* An event the phone no longer holds cannot be challenged from
               here — the window is eight days and this is older. */
            hint={duty.oldestLoaded}
          />
        </View>
      </View>
    );
  }

  const recorded = CHOICES.find(c => c.status === original.status);

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Text style={[fontStyle.fontSizeSmall2x, styles.subtitle]}>{t.subtitle}</Text>

        {/*
          A row with a request already on it cannot take another. Without this
          a driver who sees nothing happening asks again, and the office ends
          up with three copies of the same argument to decide separately.

          A refusal is different — it says so, and lets them try again with
          more detail, because "no" to a thin reason is not "no" forever.
        */}
        {original.correction === 'pending' && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.notice]}>
            <AppIcon name={icons.alert} size={17} color={accentColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.noticeText]}>{t.alreadyPending}</Text>
          </View>
        )}
        {original.correction === 'rejected' && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.notice]}>
            <AppIcon name={icons.alert} size={17} color={accentColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.noticeText]}>{t.wasRejected}</Text>
          </View>
        )}

        <Card style={styles.card}>
          <Text style={[fontStyle.fontSizeSmall1x, fontStyle.fontWeightMedium, styles.rowLabel]}>
            {t.fromStatus.toUpperCase()}
          </Text>
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.recorded]}>
            <View style={[styles.dot, { backgroundColor: recorded?.color ?? textMuted }]} />
            <Text style={[fontStyle.fontSizeNormal2x, fontStyle.fontWeightMedium, styles.rowValue]}>
              {recorded?.label ?? original.status}
            </Text>
            <Text style={[fontStyle.fontSizeSmall2x, styles.time]}>
              {duty.since(formatTime(original.startedAt))}
            </Text>
          </View>
        </Card>

        <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
          {t.toStatus.toUpperCase()}
        </Text>
        <View style={[BaseStyle.flexDirectionRow, styles.grid]}>
          {CHOICES.map(choice => {
            const on = status === choice.status;
            /* The recorded status is not offered as the correction: asking for
               it to be changed to what it already says is not a request. */
            if (choice.status === original.status) return null;
            return (
              <Pressable
                key={choice.status}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setStatus(choice.status)}
                style={[
                  BaseStyle.flex,
                  BaseStyle.alignJustifyCenter,
                  styles.choice,
                  on && { backgroundColor: choice.color },
                ]}>
                <Text
                  numberOfLines={2}
                  style={[
                    fontStyle.fontSizeExtraSmall,
                    fontStyle.fontWeightMedium,
                    styles.choiceLabel,
                    { color: on ? onAccent : choice.color },
                  ]}>
                  {choice.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={styles.card}>
          <CustomTextInput
            label={t.reason}
            value={reason}
            onChangeText={next => {
              setReason(next);
              setReasonError(undefined);
            }}
            placeholder={t.reasonPlaceholder}
            autoCapitalize="sentences"
            error={reasonError}
            multiline
            required
          />
        </Card>

        {Boolean(failure) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{failure}</Text>
          </View>
        )}

        <CustomButton
          title={t.submit}
          icon={icons.send}
          loading={sending}
          disabled={status === null || original.correction === 'pending'}
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

  subtitle: { color: textMuted, paddingTop: spacings.large, lineHeight: hp(2.5) },
  notice: {
    backgroundColor: accentSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  noticeText: { color: accentColor, marginLeft: spacings.normalx, flex: 1, lineHeight: hp(2.3) },
  card: { marginTop: spacings.large },
  rowLabel: { color: textFaint, letterSpacing: 0.8 },
  recorded: { marginTop: spacings.normal },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: spacings.normalx },
  rowValue: { color: textDark, flex: 1 },
  time: { color: textMuted },

  section: {
    color: textFaint,
    letterSpacing: 1.1,
    marginTop: spacings.xxLarge,
    marginBottom: spacings.large,
  },
  grid: {},
  choice: {
    backgroundColor: cardBgSoft,
    borderRadius: 12,
    minHeight: hp(6.4),
    paddingVertical: spacings.normal,
    paddingHorizontal: spacings.xsmall,
    marginRight: spacings.normal,
  },
  choiceLabel: { textAlign: 'center' },

  error: {
    backgroundColor: dangerSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
  submit: { marginTop: spacings.xxLarge },
});
