import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppIcon,
  Card,
  ListRow,
  icons,
} from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  accentSoft,
  appBg,
  cardBg,
  dangerColor,
  dangerSoft,
  shadowColor,
  textDark,
  textFaint,
  textMuted,
} from '../../constans/Color';
import { inspect as t, repairs as r } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { useAsync } from '../../hooks/useAsync';
import { useShift } from '../../context/ShiftContext';
import type { InspectStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<InspectStackParams, 'InspectHome'>;

/**
 * Which form to fill in, and the way to report a fault without one.
 *
 * The fault card is at the top, not buried under the form list. Something
 * breaking mid-route is the urgent case, and making a driver scroll past four
 * inspection forms to report a brake problem is how it gets reported at the
 * end of the shift instead.
 */
export function InspectHomeScreen({ navigation }: Props) {
  const { vehicle } = useShift();
  const { data: forms, loading, refreshing, error, reload } = useAsync(() => api.loadForms(), []);

  return (
    <SafeAreaView style={[BaseStyle.flex, styles.ground]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={accentColor} />
        }>
        <View style={styles.topBar}>
          <Text style={[fontStyle.fontSizeSmall2x, styles.eyebrow]}>{t.title.toUpperCase()}</Text>
          <Text style={[fontStyle.fontSizeLargeX, fontStyle.fontWeightMedium1x, styles.greeting]}>
            {vehicle ? vehicle.name : t.title}
          </Text>
        </View>

        {/*
          Both at the top, above the forms. Something breaking mid-route is the
          urgent case, and making a driver scroll past four inspection forms to
          report a brake problem is how it gets reported at the end of the shift
          instead.

          Two cards rather than one, because they are two different records: a
          fault is a finding about the truck's condition and goes on the
          compliance file, a repair request is a job for the workshop. A driver
          who wants a service booked has no fault to report.
        */}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('ReportFault')}
          style={({ pressed }) => [
            BaseStyle.flexDirectionRow,
            BaseStyle.alignItemsCenter,
            styles.faultCard,
            pressed && styles.pressed,
          ]}>
          <View style={[BaseStyle.alignJustifyCenter, styles.faultBadge]}>
            <AppIcon name={icons.warning} size={20} color={dangerColor} />
          </View>
          <View style={BaseStyle.flex}>
            <Text style={[fontStyle.fontSizeNormal2x, fontStyle.fontWeightMedium, styles.faultTitle]}>
              {t.addDefect}
            </Text>
            <Text style={[fontStyle.fontSizeSmall2x, styles.faultHint]}>{t.reportAlone}</Text>
          </View>
          <AppIcon name={icons.forward} size={18} color={textFaint} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('RaiseWorkOrder')}
          style={({ pressed }) => [
            BaseStyle.flexDirectionRow,
            BaseStyle.alignItemsCenter,
            styles.faultCard,
            styles.repairCard,
            pressed && styles.pressed,
          ]}>
          <View style={[BaseStyle.alignJustifyCenter, styles.faultBadge, styles.repairBadge]}>
            <AppIcon name={icons.truck} size={20} color={accentColor} />
          </View>
          <View style={BaseStyle.flex}>
            <Text style={[fontStyle.fontSizeNormal2x, fontStyle.fontWeightMedium, styles.faultTitle]}>
              {r.raise}
            </Text>
            <Text style={[fontStyle.fontSizeSmall2x, styles.faultHint]}>{r.raiseHint}</Text>
          </View>
          <AppIcon name={icons.forward} size={18} color={textFaint} />
        </Pressable>

        {Boolean(error) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{error}</Text>
          </View>
        )}

        {/*
          The forms section is hidden entirely when there are none, rather than
          showing "No forms to fill in".

          The console's form builder is switched off — see modules.ts and
          app/routes.tsx there — so no form can be created, which means this
          list cannot fill and the empty state was pointing a driver at
          something that does not exist. Gated on the list rather than
          commented out, so the section comes back on its own the day the
          office publishes one; nothing here has to change for that.
        */}
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : (forms ?? []).length === 0 ? null : (
          <>
            <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
              {t.forms.toUpperCase()}
            </Text>
            <Card padded={false}>
              {(forms ?? []).map((form, i) => (
                <ListRow
                  key={form.id}
                  icon={icons.inspect}
                  title={form.name}
                  detail={`${form.fields.length} ${form.fields.length === 1 ? 'question' : 'questions'}`}
                  onPress={() => navigation.navigate('InspectionForm', { formId: form.id })}
                  last={i === (forms ?? []).length - 1}
                />
              ))}
            </Card>
          </>
        )}

        <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
          {t.myWorkOrders.toUpperCase()}
        </Text>
        <Card padded={false}>
          <ListRow
            icon={icons.truck}
            title={t.myWorkOrders}
            onPress={() => navigation.navigate('MyRepairs')}
            last
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.ExtraLarge },
  pressed: { opacity: 0.75 },

  topBar: { paddingTop: spacings.xxLarge, paddingBottom: spacings.xxLarge },
  eyebrow: { color: textFaint, letterSpacing: 1.2 },
  greeting: { color: textDark, marginTop: spacings.xxsmall },

  faultCard: {
    backgroundColor: cardBg,
    borderRadius: 20,
    padding: spacings.xxLarge,
    shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  faultBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: dangerSoft,
    marginRight: spacings.large,
  },
  repairCard: { marginTop: spacings.large },
  repairBadge: { backgroundColor: accentSoft },
  faultTitle: { color: textDark },
  faultHint: { color: textMuted, marginTop: spacings.xxsmall, lineHeight: hp(2.4) },

  section: {
    color: textFaint,
    letterSpacing: 1.1,
    marginTop: spacings.xxLarge,
    marginBottom: spacings.large,
  },
  loading: { paddingVertical: hp(8), alignItems: 'center' },
  error: {
    backgroundColor: dangerSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
});
