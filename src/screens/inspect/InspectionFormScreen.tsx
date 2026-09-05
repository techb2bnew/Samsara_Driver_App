import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppIcon,
  Card,
  ConfirmModal,
  CustomButton,
  CustomTextInput,
  EmptyState,
  icons,
} from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  appBg,
  cardBgSoft,
  dangerColor,
  dangerSoft,
  okColor,
  okSoft,
  onAccent,
  textDark,
  textFaint,
  textMuted,
  warnColor,
} from '../../constans/Color';
import { common, inspect as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import type { InspectStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<InspectStackParams, 'InspectionForm'>;

/** OK, not OK, or not yet answered. Null is the state that blocks submission. */
type Answer = 'pass' | 'fail' | null;

/**
 * Filling in one inspection.
 *
 * Every item is OK or not OK — there is no third option and no default. A
 * pre-ticked form is a form that gets sent from the cab without anybody
 * walking round the truck, which is the exact failure the inspection exists to
 * prevent. So nothing can be sent until every item has been touched.
 *
 * Marking an item "not OK" opens a box for what is wrong. That answer becomes
 * a defect row when the form is sent, which is what the office sees and what a
 * work order is raised against — the tick itself is only the paperwork.
 */
export function InspectionFormScreen({ route, navigation }: Props) {
  const { formId } = route.params;
  const { state } = useAuth();
  const profile = state.status === 'signedIn' ? state.profile : null;
  const { vehicle } = useShift();

  const { data: forms, loading, error, reload } = useAsync(() => api.loadForms(), []);
  const form = (forms ?? []).find(f => f.id === formId) ?? null;

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [findings, setFindings] = useState<Record<string, string>>({});
  const [severities, setSeverities] = useState<Record<string, api.DefectInput['severity']>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  /*
   * Memoised because of the fallback: `form?.fields ?? []` is a fresh empty
   * array on every render before the form has loaded, which made the derived
   * lists below recompute forever.
   */
  const fields = useMemo(() => form?.fields ?? [], [form]);

  const unanswered = fields.filter(f => (answers[f.id] ?? null) === null).length;
  const failed = useMemo(() => fields.filter(f => answers[f.id] === 'fail'), [fields, answers]);
  /* A fault with no description is a fault the office cannot act on. */
  const missingFinding = failed.some(f => !(findings[f.id] ?? '').trim());

  function setAnswer(fieldId: string, value: Answer) {
    setFailure(null);
    setAnswers(current => ({ ...current, [fieldId]: value }));
    if (value !== 'fail') {
      // Dropped rather than kept hidden: an item flipped back to OK should not
      // send a fault written before the driver changed their mind.
      setFindings(current => {
        const next = { ...current };
        delete next[fieldId];
        return next;
      });
    }
  }

  async function send() {
    if (!profile) return;
    if (!vehicle) {
      setConfirming(false);
      setFailure(t.noVehicle);
      return;
    }

    setSending(true);
    setFailure(null);
    try {
      const defects: api.DefectInput[] = failed.map(f => ({
        area: f.label,
        finding: findings[f.id].trim(),
        severity: severities[f.id] ?? 'major',
      }));

      /*
       * The answers go up as the whole form, not just the failures. An
       * inspection is a record that every item was checked, and a submission
       * holding only the faults cannot show that.
       */
      const recorded: Record<string, string> = {};
      for (const f of fields) recorded[f.label] = answers[f.id] === 'fail' ? 'fail' : 'pass';

      await api.submitInspection(
        profile.orgId,
        profile.driverId,
        vehicle.vehicleId,
        formId,
        recorded,
        defects,
      );
      setConfirming(false);
      navigation.goBack();
    } catch (cause) {
      setConfirming(false);
      setFailure(cause instanceof Error ? cause.message : t.submitFailed);
    } finally {
      setSending(false);
    }
  }

  if (loading && !form) {
    return (
      <View style={[BaseStyle.flex, BaseStyle.alignJustifyCenter, styles.ground]}>
        <Text style={[fontStyle.fontSizeSmall2x, styles.muted]}>{common.loading}</Text>
      </View>
    );
  }

  if (!form) {
    return (
      <View style={[BaseStyle.flex, styles.ground]}>
        <View style={styles.body}>
          <EmptyState
            icon={icons.inspect}
            title={error ?? t.empty}
            hint={t.emptyHint}
            actionLabel={common.retry}
            onAction={reload}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Text style={[fontStyle.fontSizeLargeX, fontStyle.fontWeightMedium1x, styles.title]}>
          {form.name}
        </Text>
        <Text style={[fontStyle.fontSizeSmall2x, styles.intro]}>{t.formIntro}</Text>
        <Text style={[fontStyle.fontSizeSmall2x, styles.truck]}>
          {vehicle ? vehicle.name : t.noVehicle}
        </Text>

        {fields.map(field => {
          const answer = answers[field.id] ?? null;
          return (
            <Card key={field.id} style={styles.item}>
              <Text style={[fontStyle.fontSizeNormal1x, fontStyle.fontWeightMedium, styles.label]}>
                {field.label}
              </Text>

              <View style={[BaseStyle.flexDirectionRow, styles.choices]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: answer === 'pass' }}
                  onPress={() => setAnswer(field.id, 'pass')}
                  style={[
                    BaseStyle.flex,
                    BaseStyle.flexDirectionRow,
                    BaseStyle.alignJustifyCenter,
                    styles.choice,
                    answer === 'pass' && styles.choicePass,
                  ]}>
                  <AppIcon
                    name={icons.check}
                    size={16}
                    color={answer === 'pass' ? onAccent : okColor}
                  />
                  <Text
                    style={[
                      fontStyle.fontSizeSmall2x,
                      fontStyle.fontWeightMedium,
                      styles.choiceLabel,
                      { color: answer === 'pass' ? onAccent : okColor },
                    ]}>
                    {t.pass}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: answer === 'fail' }}
                  onPress={() => setAnswer(field.id, 'fail')}
                  style={[
                    BaseStyle.flex,
                    BaseStyle.flexDirectionRow,
                    BaseStyle.alignJustifyCenter,
                    styles.choice,
                    styles.choiceRight,
                    answer === 'fail' && styles.choiceFail,
                  ]}>
                  <AppIcon
                    name={icons.warning}
                    size={16}
                    color={answer === 'fail' ? onAccent : dangerColor}
                  />
                  <Text
                    style={[
                      fontStyle.fontSizeSmall2x,
                      fontStyle.fontWeightMedium,
                      styles.choiceLabel,
                      { color: answer === 'fail' ? onAccent : dangerColor },
                    ]}>
                    {t.fail}
                  </Text>
                </Pressable>
              </View>

              {answer === 'fail' && (
                <View style={styles.fault}>
                  <CustomTextInput
                    label={t.defectFinding}
                    value={findings[field.id] ?? ''}
                    onChangeText={next =>
                      setFindings(current => ({ ...current, [field.id]: next }))
                    }
                    placeholder={t.defectFinding}
                    autoCapitalize="sentences"
                    multiline
                  />

                  <Text style={[fontStyle.fontSizeSmall1x, fontStyle.fontWeightMedium, styles.sev]}>
                    {t.defectSeverity}
                  </Text>
                  <View style={[BaseStyle.flexDirectionRow, styles.sevRow]}>
                    {(['minor', 'major', 'out_of_service'] as const).map(level => {
                      const on = (severities[field.id] ?? 'major') === level;
                      const tone =
                        level === 'out_of_service'
                          ? dangerColor
                          : level === 'major'
                            ? warnColor
                            : textMuted;
                      return (
                        <Pressable
                          key={level}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          onPress={() =>
                            setSeverities(current => ({ ...current, [field.id]: level }))
                          }
                          style={[
                            BaseStyle.alignJustifyCenter,
                            styles.sevChip,
                            on && { backgroundColor: tone },
                          ]}>
                          <Text
                            style={[
                              fontStyle.fontSizeExtraSmall,
                              fontStyle.fontWeightMedium,
                              { color: on ? onAccent : tone },
                            ]}>
                            {t.severity[level]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </Card>
          );
        })}

        <View
          style={[
            BaseStyle.flexDirectionRow,
            BaseStyle.alignItemsCenter,
            styles.summary,
            failed.length > 0 ? styles.summaryBad : styles.summaryGood,
          ]}>
          <AppIcon
            name={failed.length > 0 ? icons.warning : icons.checkCircle}
            size={18}
            color={failed.length > 0 ? dangerColor : okColor}
          />
          <Text
            style={[
              fontStyle.fontSizeSmall2x,
              styles.summaryText,
              { color: failed.length > 0 ? dangerColor : okColor },
            ]}>
            {failed.length > 0 ? t.faultsFound(failed.length) : t.noFaults}
          </Text>
        </View>

        {Boolean(failure) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{failure}</Text>
          </View>
        )}

        {/* The reason a driver cannot send yet, rather than a dead button. */}
        {unanswered > 0 ? (
          <Text style={[fontStyle.fontSizeSmall1x, styles.blocked]}>{t.answerAll}</Text>
        ) : missingFinding ? (
          <Text style={[fontStyle.fontSizeSmall1x, styles.blocked]}>{t.findingRequired}</Text>
        ) : null}

        <CustomButton
          title={t.submit}
          icon={icons.send}
          disabled={unanswered > 0 || missingFinding || !vehicle}
          onPress={() => setConfirming(true)}
        />
      </ScrollView>

      <ConfirmModal
        visible={confirming}
        title={t.submit}
        message={failed.length > 0 ? t.faultsFound(failed.length) : t.noFaults}
        confirmLabel={t.submit}
        icon={icons.shield}
        loading={sending}
        onConfirm={() => {
          send().catch(() => {});
        }}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.ExtraLarge },

  title: { color: textDark, paddingTop: spacings.large },
  intro: { color: textMuted, marginTop: spacings.xsmall, lineHeight: hp(2.5) },
  truck: { color: textFaint, marginTop: spacings.normal },
  muted: { color: textMuted },

  item: { marginTop: spacings.large },
  label: { color: textDark },
  choices: { marginTop: spacings.large },
  choice: {
    flexDirection: 'row',
    backgroundColor: cardBgSoft,
    borderRadius: 12,
    paddingVertical: spacings.normalx,
  },
  choiceRight: { marginLeft: spacings.normal },
  choicePass: { backgroundColor: okColor },
  choiceFail: { backgroundColor: dangerColor },
  choiceLabel: { marginLeft: spacings.small },

  fault: { marginTop: spacings.large },
  sev: { color: textFaint, marginTop: spacings.normal },
  sevRow: { marginTop: spacings.normal },
  sevChip: {
    backgroundColor: cardBgSoft,
    borderRadius: 10,
    paddingVertical: spacings.small,
    paddingHorizontal: spacings.normalx,
    marginRight: spacings.normal,
  },

  summary: {
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.xxLarge,
  },
  summaryGood: { backgroundColor: okSoft },
  summaryBad: { backgroundColor: dangerSoft },
  summaryText: { marginLeft: spacings.normalx, flex: 1 },

  error: {
    backgroundColor: dangerSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
  blocked: {
    color: textMuted,
    marginTop: spacings.large,
    marginBottom: spacings.normal,
    textAlign: 'center',
  },
});
