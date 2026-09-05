import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { AppIcon, Card, icons } from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  accentSoft,
  appBg,
  borderColor,
  cardBgSoft,
  dangerColor,
  dangerSoft,
  onAccent,
  textDark,
  textFaint,
  textMuted,
} from '../../constans/Color';
import { settings as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { useSettings } from '../../context/SettingsContext';

/**
 * The driver's own preferences.
 *
 * Saved as they are changed rather than behind a Save button. There are four
 * of them and none is destructive; a driver who flips a switch and walks away
 * should not lose it, and a Save button on a screen this small is a step that
 * exists only to be forgotten.
 *
 * The previous value is put back if the write fails, so the switch never shows
 * a setting the server does not have.
 */
export function SettingsScreen() {
  /*
   * Read from the shared context rather than loaded here.
   *
   * The break reminder obeys these too, and two copies would drift — a driver
   * could turn the reminder off and go on being reminded until the app was
   * restarted, which is exactly the kind of thing that makes a settings screen
   * look like it does nothing.
   */
  const { settings: value, loading, save } = useSettings();
  const [failure, setFailure] = useState<string | null>(null);

  async function change(patch: Partial<api.DriverSettings>) {
    setFailure(null);
    try {
      await save(patch);
    } catch {
      setFailure(t.failed);
    }
  }

  if (loading) {
    return (
      <View style={[BaseStyle.flex, BaseStyle.alignJustifyCenter, styles.ground]}>
        <ActivityIndicator color={accentColor} />
      </View>
    );
  }

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[fontStyle.fontSizeSmall2x, styles.subtitle]}>{t.subtitle}</Text>

        {Boolean(failure) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{failure}</Text>
          </View>
        )}

        <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
          {t.units.toUpperCase()}
        </Text>
        <Card>
          <View style={BaseStyle.flexDirectionRow}>
            {(
              [
                ['km', t.unitsKm],
                ['mi', t.unitsMi],
              ] as const
            ).map(([unit, label]) => {
              const on = value?.distanceUnit === unit;
              return (
                <Pressable
                  key={unit}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    change({ distanceUnit: unit }).catch(() => {});
                  }}
                  style={[
                    BaseStyle.flex,
                    BaseStyle.alignJustifyCenter,
                    styles.unit,
                    on && styles.unitOn,
                  ]}>
                  <Text
                    style={[
                      fontStyle.fontSizeSmall2x,
                      fontStyle.fontWeightMedium,
                      { color: on ? onAccent : textMuted },
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
          {t.notifications.toUpperCase()}
        </Text>
        <Card>
          <Toggle
            label={t.notifyPush}
            /* Honest rather than hidden: nothing sends push yet, and a switch
               that quietly does nothing is worse than one that says so. */
            hint={t.notifyPushHint}
            value={value?.notifyPush ?? false}
            onChange={(next) => {
              change({ notifyPush: next }).catch(() => {});
            }}
          />
          <View style={styles.divider} />
          <Toggle
            label={t.notifyEmail}
            value={value?.notifyEmail ?? false}
            onChange={(next) => {
              change({ notifyEmail: next }).catch(() => {});
            }}
          />
          <View style={styles.divider} />
          <Toggle
            label={t.notifyBreak}
            hint={t.notifyBreakHint}
            value={value?.notifyBreakReminder ?? false}
            onChange={(next) => {
              change({ notifyBreakReminder: next }).catch(() => {});
            }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter]}>
        <Text
          style={[
            BaseStyle.flex,
            fontStyle.fontSizeNormal1x,
            fontStyle.fontWeightMedium,
            styles.toggleLabel,
          ]}>
          {label}
        </Text>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: cardBgSoft, true: accentSoft }}
          thumbColor={value ? accentColor : textFaint}
        />
      </View>
      {Boolean(hint) && (
        <Text style={[fontStyle.fontSizeSmall1x, styles.toggleHint]}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.ExtraLarge },
  subtitle: { color: textMuted, paddingTop: spacings.large, lineHeight: hp(2.4) },
  section: {
    color: textFaint,
    letterSpacing: 1.1,
    marginTop: spacings.xxLarge,
    marginBottom: spacings.large,
  },

  unit: {
    backgroundColor: cardBgSoft,
    borderRadius: 12,
    paddingVertical: spacings.normalx,
    marginRight: spacings.normal,
  },
  unitOn: { backgroundColor: accentColor },

  toggle: { paddingVertical: spacings.normal },
  toggleLabel: { color: textDark },
  toggleHint: { color: textMuted, marginTop: spacings.xxsmall, lineHeight: hp(2.2) },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: borderColor,
    marginVertical: spacings.small,
  },

  error: {
    backgroundColor: dangerSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
});
