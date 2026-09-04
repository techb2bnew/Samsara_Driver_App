import React, { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppIcon,
  Badge,
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
  accentSoft,
  appBg,
  cardBgSoft,
  dangerColor,
  dangerSoft,
  okColor,
  okSoft,
  textDark,
  textMuted,
} from '../../constans/Color';
import { common, routeScreen as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import type { RouteStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<RouteStackParams, 'RouteHome'>;

/** "08:00 – 09:00", or nothing when the office set no window. */
function windowOf(from: string | null, to: string | null): string {
  if (!from || !to) return t.noWindow;
  const at = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  return t.window(at(from), at(to));
}

/**
 * The assigned route, stop by stop.
 *
 * The progress bar and "5 of 8" are derived from which stops have an arrival
 * time, not from a stored counter. A counter would need updating on every
 * arrival and could disagree with the stops themselves — and it is the stops
 * an inspector would read.
 *
 * Stops stay in sequence rather than sorting done ones out of the way: a
 * driver checks the order against where they actually are, and a list that
 * reorders itself as they work is one they have to re-read each time.
 */
export function RouteHomeScreen({ navigation }: Props) {
  const { state } = useAuth();
  const profile = state.status === 'signedIn' ? state.profile : null;

  const { data: route, loading, error, reload } = useAsync(
    () => (profile ? api.loadMyRoute(profile.driverId) : Promise.resolve(null)),
    [profile?.driverId],
  );

  const done = useMemo(
    () => (route?.stops ?? []).filter(s => s.arrivedAt !== null).length,
    [route],
  );
  const total = route?.stops.length ?? 0;

  if (loading) {
    return (
      <SafeAreaView style={[BaseStyle.flex, styles.ground]} edges={['top']}>
        <View style={[BaseStyle.flex, BaseStyle.alignJustifyCenter]}>
          <ActivityIndicator color={accentColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[BaseStyle.flex, styles.ground]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor={accentColor} />
        }>
        <ScreenTitle title={t.title} subtitle={route ? route.reference : undefined} />

        {Boolean(error) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{error}</Text>
          </View>
        )}

        {!route ? (
          <EmptyState
            icon={icons.route}
            title={t.empty}
            hint={t.emptyHint}
            actionLabel={common.retry}
            onAction={reload}
          />
        ) : (
          <>
            {/* --------------------------------------------------- progress */}
            <Card>
              <View
                style={[
                  BaseStyle.flexDirectionRow,
                  BaseStyle.alignItemsCenter,
                  BaseStyle.justifyContentSpaceBetween,
                ]}>
                <Text
                  style={[fontStyle.fontSizeNormal2x, fontStyle.fontWeightMedium, styles.progress]}>
                  {t.stopsDone(done, total)}
                </Text>
                {done === total && total > 0 ? (
                  <Badge label={common.done} color={okColor} background={okSoft} />
                ) : (
                  <Badge label={route.status} color={accentColor} background={accentSoft} />
                )}
              </View>

              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: total === 0 ? '0%' : `${Math.round((done / total) * 100)}%` },
                  ]}
                />
              </View>

              <CustomButton
                title={t.openMap}
                icon={icons.route}
                variant="outline"
                onPress={() => navigation.navigate('RouteMap', { routeId: route.id })}
                style={styles.mapButton}
              />
            </Card>

            {/* ------------------------------------------------------ stops */}
            <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
              {t.stopsDone(done, total).toUpperCase()}
            </Text>

            <Card padded={false}>
              {route.stops.map((stop, i) => {
                const arrived = stop.arrivedAt !== null;
                return (
                  <ListRow
                    key={stop.id}
                    title={`${stop.sequence}. ${stop.name}`}
                    detail={stop.address ?? undefined}
                    extra={
                      arrived
                        ? t.arrivedAt(
                            `${String(new Date(stop.arrivedAt!).getHours()).padStart(2, '0')}:${String(
                              new Date(stop.arrivedAt!).getMinutes(),
                            ).padStart(2, '0')}`,
                          )
                        : windowOf(stop.windowStartAt, stop.windowEndAt)
                    }
                    icon={arrived ? icons.checkCircle : icons.pin}
                    tone={arrived ? okColor : undefined}
                    onPress={() => navigation.navigate('StopDetail', { stopId: stop.id })}
                    last={i === route.stops.length - 1}
                  />
                );
              })}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.ExtraLarge },
  progress: { color: textDark },
  track: {
    height: hp(0.9),
    backgroundColor: cardBgSoft,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: spacings.large,
  },
  fill: { height: '100%', backgroundColor: accentColor, borderRadius: 99 },
  mapButton: { marginTop: spacings.large },
  section: {
    color: textMuted,
    letterSpacing: 1.1,
    marginTop: spacings.xxLarge,
    marginBottom: spacings.normalx,
  },
  error: {
    backgroundColor: dangerSoft,
    borderRadius: 8,
    padding: spacings.large,
    marginBottom: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
});
