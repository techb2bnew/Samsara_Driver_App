import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppIcon,
  Card,
  CustomButton,
  EmptyState,
  ListRow,
  ScreenTitle,
  icons,
} from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  appBg,
  dangerColor,
  dangerSoft,
  textMuted,
} from '../../constans/Color';
import { common, inspect as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { useAsync } from '../../hooks/useAsync';
import { useShift } from '../../context/ShiftContext';
import type { InspectStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<InspectStackParams, 'InspectHome'>;

/**
 * Which form to fill in, and the way to report a fault without one.
 *
 * The fault button is at the top, not buried under the form list. Something
 * breaking mid-route is the urgent case, and making a driver scroll past four
 * inspection forms to report a brake problem is how it gets reported at the
 * end of the shift instead.
 */
export function InspectHomeScreen({ navigation }: Props) {
  const { vehicle } = useShift();
  const { data: forms, loading, error, reload } = useAsync(() => api.loadForms(), []);

  return (
    <SafeAreaView style={[BaseStyle.flex, styles.ground]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor={accentColor} />
        }>
        <ScreenTitle title={t.title} subtitle={vehicle ? vehicle.name : undefined} />

        <CustomButton
          title={t.addDefect}
          icon={icons.warning}
          variant="danger"
          onPress={() => navigation.navigate('ReportFault')}
        />
        <Text style={[fontStyle.fontSizeSmall2x, styles.faultHint]}>{t.reportAlone}</Text>

        {Boolean(error) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : (forms ?? []).length === 0 ? (
          <EmptyState
            icon={icons.inspect}
            title={t.empty}
            hint={t.emptyHint}
            actionLabel={common.retry}
            onAction={reload}
          />
        ) : (
          <>
            <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
              {t.title.toUpperCase()}
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
  faultHint: {
    color: textMuted,
    marginTop: spacings.normalx,
    lineHeight: hp(2.6),
  },
  section: {
    color: textMuted,
    letterSpacing: 1.1,
    marginTop: spacings.xxLarge,
    marginBottom: spacings.normalx,
  },
  loading: { paddingVertical: hp(8), alignItems: 'center' },
  error: {
    backgroundColor: dangerSoft,
    borderRadius: 8,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
});
