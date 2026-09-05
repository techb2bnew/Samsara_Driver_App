import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppIcon,
  Badge,
  CustomButton,
  EmptyState,
  icons,
} from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  accentSoft,
  appBg,
  borderColor,
  cardBg,
  cardBgSoft,
  dangerColor,
  dangerSoft,
  okColor,
  okSoft,
  onAccent,
  shadowColor,
  textDark,
  textFaint,
  textMuted,
} from '../../constans/Color';
import { common, routeScreen as t } from '../../constans/Constants';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';
import { useShift } from '../../context/ShiftContext';
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

function clockOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
  const { route, loading, error, refresh } = useShift();

  /*
   * Memoised because of the fallback: `route?.stops ?? []` hands back a fresh
   * empty array on every render when there is no route, which made the count
   * below recompute forever.
   */
  const stops = useMemo(() => route?.stops ?? [], [route]);
  const done = useMemo(() => stops.filter(s => s.arrivedAt !== null).length, [stops]);
  const total = stops.length;
  const nextStop = stops.find(s => s.arrivedAt === null) ?? null;
  const complete = total > 0 && done === total;

  return (
    <SafeAreaView style={[BaseStyle.flex, styles.ground]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading && Boolean(route)} onRefresh={refresh} tintColor={accentColor} />
        }>
        <View style={styles.topBar}>
          <Text style={[fontStyle.fontSizeSmall2x, styles.eyebrow]}>{t.title.toUpperCase()}</Text>
          <Text style={[fontStyle.fontSizeLargeX, fontStyle.fontWeightMedium1x, styles.greeting]}>
            {route ? route.reference : t.title}
          </Text>
        </View>

        {Boolean(error) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{error}</Text>
          </View>
        )}

        {loading && !route ? (
          <View style={styles.booting}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : !route ? (
          <EmptyState
            icon={icons.route}
            title={t.empty}
            hint={t.emptyHint}
            actionLabel={common.retry}
            onAction={refresh}
          />
        ) : (
          <>
            <View style={styles.hero}>
              <View
                style={[styles.heroBar, { backgroundColor: complete ? okColor : accentColor }]}
              />
              <View style={styles.heroBody}>
                <View
                  style={[
                    BaseStyle.flexDirectionRow,
                    BaseStyle.alignItemsCenter,
                    BaseStyle.justifyContentSpaceBetween,
                  ]}>
                  <Text
                    style={[fontStyle.fontSizeSmall1x, fontStyle.fontWeightMedium, styles.heroKicker]}>
                    {complete ? t.routeComplete : t.nextStop}
                  </Text>
                  {complete ? (
                    <Badge label={common.done} color={okColor} background={okSoft} />
                  ) : (
                    <Badge
                      label={t.stopsDone(done, total)}
                      color={accentColor}
                      background={accentSoft}
                    />
                  )}
                </View>

                {nextStop ? (
                  <>
                    <Text
                      style={[
                        fontStyle.fontSizeLargeX,
                        fontStyle.fontWeightMedium1x,
                        styles.heroTitle,
                      ]}>
                      {nextStop.sequence}. {nextStop.name}
                    </Text>
                    {Boolean(nextStop.address) && (
                      <Text style={[fontStyle.fontSizeSmall2x, styles.heroMeta]}>
                        {nextStop.address}
                      </Text>
                    )}
                    <Text style={[fontStyle.fontSizeSmall2x, styles.heroWindow]}>
                      {windowOf(nextStop.windowStartAt, nextStop.windowEndAt)}
                    </Text>
                  </>
                ) : (
                  <Text
                    style={[
                      fontStyle.fontSizeLargeX,
                      fontStyle.fontWeightMedium1x,
                      styles.heroTitle,
                    ]}>
                    {t.stopsDone(done, total)}
                  </Text>
                )}

                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      complete && styles.fillDone,
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
              </View>
            </View>

            <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
              {t.stops.toUpperCase()}
            </Text>

            <View style={styles.timelineCard}>
              {stops.map((stop, i) => {
                const arrived = stop.arrivedAt !== null;
                const isNext = nextStop?.id === stop.id;
                const last = i === stops.length - 1;
                return (
                  <Pressable
                    key={stop.id}
                    accessibilityRole="button"
                    onPress={() => navigation.navigate('StopDetail', { stopId: stop.id })}
                    style={({ pressed }) => [
                      BaseStyle.flexDirectionRow,
                      styles.stopRow,
                      isNext && styles.stopNext,
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.rail}>
                      <View
                        style={[
                          BaseStyle.alignJustifyCenter,
                          styles.dot,
                          arrived && styles.dotDone,
                          isNext && styles.dotNext,
                        ]}>
                        {arrived ? (
                          <AppIcon name={icons.check} size={12} color={onAccent} />
                        ) : (
                          <Text
                            style={[
                              fontStyle.fontSizeExtraSmall,
                              fontStyle.fontWeightMedium1x,
                              styles.dotText,
                              isNext && styles.dotTextNext,
                            ]}>
                            {stop.sequence}
                          </Text>
                        )}
                      </View>
                      {!last && <View style={[styles.stem, arrived && styles.stemDone]} />}
                    </View>

                    <View style={styles.stopBody}>
                      <View
                        style={[
                          BaseStyle.flexDirectionRow,
                          BaseStyle.alignItemsCenter,
                          BaseStyle.justifyContentSpaceBetween,
                        ]}>
                        <Text
                          numberOfLines={1}
                          style={[
                            fontStyle.fontSizeNormal1x,
                            fontStyle.fontWeightMedium,
                            styles.stopName,
                            arrived && styles.stopNameDone,
                          ]}>
                          {stop.name}
                        </Text>
                        <AppIcon name={icons.forward} size={16} color={textFaint} />
                      </View>
                      {Boolean(stop.address) && (
                        <Text numberOfLines={1} style={[fontStyle.fontSizeSmall2x, styles.stopAddr]}>
                          {stop.address}
                        </Text>
                      )}
                      <Text style={[fontStyle.fontSizeSmall1x, styles.stopExtra]}>
                        {arrived
                          ? t.arrivedAt(clockOf(stop.arrivedAt!))
                          : windowOf(stop.windowStartAt, stop.windowEndAt)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
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

  hero: {
    backgroundColor: cardBg,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroBar: { height: 4 },
  heroBody: { padding: spacings.xxLarge },
  heroKicker: { color: textFaint, letterSpacing: 0.4 },
  heroTitle: { color: textDark, marginTop: spacings.normal },
  heroMeta: { color: textMuted, marginTop: spacings.small },
  heroWindow: { color: textMuted, marginTop: spacings.xxsmall },
  track: {
    height: hp(0.8),
    backgroundColor: cardBgSoft,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: spacings.xLarge,
  },
  fill: { height: '100%', backgroundColor: accentColor, borderRadius: 99 },
  fillDone: { backgroundColor: okColor },
  mapButton: { marginTop: spacings.xLarge },

  section: {
    color: textFaint,
    letterSpacing: 1.1,
    marginTop: spacings.xxLarge,
    marginBottom: spacings.large,
  },
  timelineCard: {
    backgroundColor: cardBg,
    borderRadius: 20,
    paddingVertical: spacings.large,
    paddingHorizontal: spacings.xLarge,
    shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  stopRow: {
    paddingVertical: spacings.normal,
    paddingHorizontal: spacings.normal,
    borderRadius: 14,
  },
  stopNext: { backgroundColor: accentSoft },
  rail: { width: wp(8), alignItems: 'center' },
  dot: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    backgroundColor: cardBgSoft,
  },
  dotDone: { backgroundColor: okColor },
  dotNext: { backgroundColor: accentColor },
  dotText: { color: textMuted },
  dotTextNext: { color: onAccent },
  stem: {
    width: 2,
    flex: 1,
    minHeight: hp(2.2),
    backgroundColor: borderColor,
    marginTop: 4,
  },
  stemDone: { backgroundColor: okColor },
  stopBody: { flex: 1, marginLeft: spacings.large, paddingBottom: spacings.large },
  stopName: { color: textDark, flex: 1, marginRight: spacings.normal },
  stopNameDone: { color: textMuted },
  stopAddr: { color: textMuted, marginTop: spacings.xxsmall },
  stopExtra: { color: textFaint, marginTop: spacings.xxsmall },

  error: {
    backgroundColor: dangerSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginBottom: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
  booting: { paddingVertical: hp(8), alignItems: 'center' },
});
