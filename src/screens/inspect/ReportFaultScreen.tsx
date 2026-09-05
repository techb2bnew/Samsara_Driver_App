import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppIcon,
  Card,
  CustomButton,
  CustomTextInput,
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
  onAccent,
  textDark,
  textFaint,
  textMuted,
  warnColor,
  warnSoft,
} from '../../constans/Color';
import { inspect as t, repairs as r } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import type { InspectStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<InspectStackParams, 'ReportFault'>;

const LEVELS = ['minor', 'major', 'out_of_service'] as const;

/**
 * Reporting a fault with no inspection behind it.
 *
 * "The AC has gone", halfway through a route. A driver should not have to fill
 * in a whole pre-trip form to tell the office something is broken, so the
 * database allows a defect with no submission and this is the screen that
 * files one.
 *
 * The switch at the bottom is the difference between telling the office and
 * asking the workshop. Both are useful and they are not the same thing: a
 * scuffed mudflap goes on the record and waits for the next service, a dead
 * air conditioner in June needs a job raising today. The driver knows which
 * one they are looking at; nothing here can work it out for them.
 */
export function ReportFaultScreen({ navigation }: Props) {
  const { state } = useAuth();
  const profile = state.status === 'signedIn' ? state.profile : null;
  const { vehicle } = useShift();

  const [area, setArea] = useState('');
  const [finding, setFinding] = useState('');
  const [severity, setSeverity] = useState<api.DefectInput['severity']>('major');
  const [askWorkshop, setAskWorkshop] = useState(false);
  const [errors, setErrors] = useState<{ area?: string; finding?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!profile) return;
    if (!vehicle) {
      setFailure(t.noVehicle);
      return;
    }

    const next: typeof errors = {};
    if (!area.trim()) next.area = t.defectArea;
    if (!finding.trim()) next.finding = t.findingRequired;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSending(true);
    setFailure(null);
    setWarning(null);
    try {
      /*
       * The time the driver tapped, not the time the write lands. Same reason
       * as every other write in this app: the tap happens next to the truck,
       * which is often where there is no signal.
       */
      const result = await api.fileFault(profile.orgId, profile.driverId, vehicle.vehicleId, {
        area,
        finding,
        severity,
        askWorkshop,
        at: new Date().toISOString(),
      });

      /*
       * The fault is filed either way. If only the workshop request failed the
       * driver is told, and told what to do about it — going back and filing
       * the whole thing again would put a duplicate fault on the truck.
       */
      if (result.workshopError) {
        setWarning(t.workshopFailed);
        setSending(false);
        return;
      }
      navigation.goBack();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : t.submitFailed);
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
        <Text style={[fontStyle.fontSizeSmall2x, styles.truck]}>
          {vehicle ? vehicle.name : t.noVehicle}
        </Text>

        <Card style={styles.card}>
          <CustomTextInput
            label={t.defectArea}
            value={area}
            onChangeText={next => {
              setArea(next);
              setErrors(current => ({ ...current, area: undefined }));
            }}
            placeholder="Air conditioning"
            autoCapitalize="sentences"
            error={errors.area}
            required
          />

          <CustomTextInput
            label={t.defectFinding}
            value={finding}
            onChangeText={next => {
              setFinding(next);
              setErrors(current => ({ ...current, finding: undefined }));
            }}
            placeholder="Blows warm on both settings, started this morning"
            autoCapitalize="sentences"
            error={errors.finding}
            multiline
            required
          />

          <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.sev]}>
            {t.defectSeverity}
          </Text>
          <View style={[BaseStyle.flexDirectionRow, styles.sevRow]}>
            {LEVELS.map(level => {
              const on = severity === level;
              const tone =
                level === 'out_of_service' ? dangerColor : level === 'major' ? warnColor : textMuted;
              return (
                <Pressable
                  key={level}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setSeverity(level)}
                  style={[
                    BaseStyle.flex,
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
        </Card>

        <Card style={styles.card}>
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter]}>
            <View style={BaseStyle.flex}>
              <Text
                style={[fontStyle.fontSizeNormal1x, fontStyle.fontWeightMedium, styles.switchLabel]}>
                {t.askWorkshop}
              </Text>
            </View>
            <Switch
              value={askWorkshop}
              onValueChange={setAskWorkshop}
              trackColor={{ false: cardBgSoft, true: accentSoft }}
              thumbColor={askWorkshop ? accentColor : textFaint}
            />
          </View>
          <Text style={[fontStyle.fontSizeSmall1x, styles.switchHint]}>{t.askWorkshopHint}</Text>
        </Card>

        {Boolean(warning) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.warn]}>
            <AppIcon name={icons.alert} size={17} color={warnColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.warnText]}>{warning}</Text>
          </View>
        )}

        {Boolean(failure) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{failure}</Text>
          </View>
        )}

        <CustomButton
          title={askWorkshop ? r.raiseSubmit : t.defectSubmit}
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

  truck: { color: textFaint, paddingTop: spacings.large },
  card: { marginTop: spacings.large },

  sev: { color: textFaint, marginTop: spacings.large },
  sevRow: { marginTop: spacings.normal },
  sevChip: {
    backgroundColor: cardBgSoft,
    borderRadius: 10,
    paddingVertical: spacings.normal,
    marginRight: spacings.normal,
  },

  switchLabel: { color: textDark },
  switchHint: { color: textMuted, marginTop: spacings.normal, lineHeight: hp(2.2) },

  warn: {
    backgroundColor: warnSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  warnText: { color: warnColor, marginLeft: spacings.normalx, flex: 1 },
  error: {
    backgroundColor: dangerSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
  submit: { marginTop: spacings.xxLarge },
});
