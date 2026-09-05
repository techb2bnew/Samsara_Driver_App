import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon, CustomButton, icons } from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  accentSoft,
  appBg,
  borderColor,
  cardBg,
  dangerColor,
  dangerSoft,
  okColor,
  shadowColor,
  textDark,
  textFaint,
  textMuted,
} from '../../constans/Color';
import { common, vehiclePicker as t } from '../../constans/Constants';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';
import * as api from '../../supabase/api';
import type { VehicleOption } from '../../supabase/api';
import { useShift } from '../../context/ShiftContext';
import type { DutyStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<DutyStackParams, 'VehiclePicker'>;

/**
 * Picks the truck for this shift.
 *
 * Nothing else in the app works until this is done: hours attach to a vehicle,
 * an inspection is filed against one, and report_position looks the assignment
 * up rather than taking a vehicle id — so a driver with no truck signed on
 * reports no position at all.
 *
 * The list comes from row-level security, not from a filter here. The database
 * returns the trucks at this driver's depot plus any they are already assigned
 * to, which is why a driver seconded elsewhere still sees the one they were
 * given. An empty list is therefore a real answer — the office has not put a
 * truck at their depot — and it says so rather than showing a spinner forever.
 */
export function VehiclePickerScreen({ navigation }: Props) {
  const { vehicle, signOnToVehicle } = useShift();

  const [options, setOptions] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(vehicle?.vehicleId ?? null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setOptions(await api.loadVehicleOptions());
    } catch (err) {
      setError(err instanceof Error ? err.message : common.somethingWrong);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStart() {
    if (!chosen) return;
    setSaving(true);
    setError(null);
    try {
      await signOnToVehicle(chosen);
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[fontStyle.fontSizeNormal1x, styles.subtitle]}>{t.subtitle}</Text>

        {loading ? (
          <View style={[BaseStyle.alignJustifyCenter, styles.loading]}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : options.length === 0 ? (
          <View style={[BaseStyle.alignItemsCenter, styles.empty]}>
            <View style={[BaseStyle.alignJustifyCenter, styles.emptyArt]}>
              <AppIcon name={icons.truck} size={26} color={accentColor} />
            </View>
            <Text
              style={[
                fontStyle.fontSizeNormal2x,
                fontStyle.fontWeightMedium,
                BaseStyle.textAlign,
                styles.emptyTitle,
              ]}>
              {t.empty}
            </Text>
            <Text style={[fontStyle.fontSizeNormal1x, BaseStyle.textAlign, styles.emptyHint]}>
              {t.emptyHint}
            </Text>
            <CustomButton
              title={common.retry}
              variant="outline"
              icon={icons.refresh}
              onPress={load}
              style={styles.retry}
            />
          </View>
        ) : (
          options.map(option => {
            const active = option.id === chosen;
            const current = option.id === vehicle?.vehicleId;
            /*
              Disabled rather than hidden. A driver walking up to a truck and
              not finding it in the list assumes the app is broken; the same
              truck greyed out with a reason tells them to go and find out who
              has it. sign_on_to_vehicle refuses it anyway — this is so they
              never get that far.
            */
            const busy = Boolean(option.inUse) && !current;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled: busy }}
                accessibilityLabel={busy ? `${option.name}. ${t.inUse}` : option.name}
                disabled={busy}
                onPress={() => setChosen(option.id)}
                style={({ pressed }) => [
                  BaseStyle.flexDirectionRow,
                  BaseStyle.alignItemsCenter,
                  styles.row,
                  active && styles.rowActive,
                  busy && styles.rowBusy,
                  pressed && styles.pressed,
                ]}>
                <View
                  style={[
                    BaseStyle.alignJustifyCenter,
                    styles.badge,
                    active && styles.badgeActive,
                  ]}>
                  <AppIcon
                    name={icons.truck}
                    size={20}
                    color={accentColor}
                  />
                </View>

                <View style={BaseStyle.flex}>
                  <Text
                    style={[
                      fontStyle.fontSizeNormal2x,
                      fontStyle.fontWeightMedium,
                      styles.name,
                    ]}>
                    {option.name}
                  </Text>
                  <Text style={[fontStyle.fontSizeSmall2x, styles.meta]}>
                    {[option.plate, option.makeModel].filter(Boolean).join(' · ')}
                  </Text>
                  {/* Shown so a driver notices when they are about to sign on
                      to a truck they are already on, and to make "change
                      truck" obviously a change. */}
                  {current ? (
                    <Text style={[fontStyle.fontSizeSmall1x, styles.currentTag]}>
                      {t.current}
                    </Text>
                  ) : busy ? (
                    <Text style={[fontStyle.fontSizeSmall1x, styles.busyTag]}>{t.inUse}</Text>
                  ) : null}
                </View>

                {busy ? (
                  <AppIcon name={icons.lock} size={18} color={textFaint} />
                ) : active ? (
                  <AppIcon name={icons.checkCircle} size={22} color={accentColor} />
                ) : null}
              </Pressable>
            );
          })
        )}

        {Boolean(error) && (
          <View
            style={[
              BaseStyle.flexDirectionRow,
              BaseStyle.alignItemsCenter,
              BaseStyle.borderRadius8,
              styles.error,
            ]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {options.length > 0 && (
        <View style={styles.footer}>
          <CustomButton
            title={vehicle ? t.change : t.select}
            icon={icons.check}
            loading={saving}
            disabled={!chosen || chosen === vehicle?.vehicleId}
            onPress={handleStart}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { padding: spacings.xxLarge },
  pressed: { opacity: 0.75 },
  subtitle: { color: textMuted, lineHeight: hp(2.8), marginBottom: spacings.xxLarge },
  loading: { paddingVertical: hp(10) },

  row: {
    backgroundColor: cardBg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: spacings.xxLarge,
    marginBottom: spacings.large,
    shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rowActive: { borderColor: accentColor },
  // Dimmed rather than greyed to a different colour: the row still has to be
  // readable, because the whole point is that the driver reads why.
  rowBusy: { opacity: 0.55 },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: accentSoft,
    marginRight: spacings.large,
  },
  badgeActive: { backgroundColor: accentSoft },
  name: { color: textDark },
  meta: { color: textMuted, marginTop: spacings.xxsmall },
  currentTag: { color: okColor, marginTop: spacings.xxsmall },
  busyTag: { color: textMuted, marginTop: spacings.xxsmall },

  empty: { paddingVertical: hp(6) },
  emptyArt: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: accentSoft,
    marginBottom: spacings.xLarge,
  },
  emptyTitle: { color: textDark, marginBottom: spacings.normalx },
  emptyHint: { color: textMuted, lineHeight: hp(2.8), maxWidth: wp(76) },
  retry: { marginTop: spacings.xxLarge },

  error: {
    backgroundColor: dangerSoft,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },

  footer: {
    padding: spacings.xxLarge,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: borderColor,
    backgroundColor: cardBg,
  },
});
