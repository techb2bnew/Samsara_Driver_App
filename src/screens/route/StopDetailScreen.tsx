import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppIcon,
  Card,
  ConfirmModal,
  CustomButton,
  EmptyState,
  icons,
} from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  appBg,
  cardBgSoft,
  dangerColor,
  dangerSoft,
  okColor,
  okSoft,
  warnColor,
  warnSoft,
  onAccent,
  textBody,
  textDark,
  textFaint,
  textMuted,
} from '../../constans/Color';
import { common, routeScreen, stopDetail as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { formatTime } from '../../helpers/duty';
import {
  currentFix,
  formatDistance,
  metresBetween,
  type Fix,
  type FixFailure,
} from '../../helpers/location';
import { useShift } from '../../context/ShiftContext';
import type { RouteStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<RouteStackParams, 'StopDetail'>;

/**
 * One stop, and the one thing a driver does at it.
 *
 * The stop is read out of the route the shift already holds rather than
 * fetched by id. The route is loaded once for the whole tab, and a second
 * query here would let this screen and the list behind it disagree about
 * whether the stop has been marked.
 *
 * Marking arrival is confirmed, because it is not undoable from the app and
 * the office plans the rest of the day around it. A mis-tap in a moving cab is
 * easy; unmarking is a phone call.
 */
export function StopDetailScreen({ route: nav, navigation }: Props) {
  const { stopId } = nav.params;
  const { route, refresh } = useShift();

  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const stop = route?.stops.find(s => s.id === stopId) ?? null;
  const hasLocation = stop?.latitude !== null && stop?.longitude !== null;

  /*
    How far the driver is from this stop.
   
    'checking' while the fix is being taken, a number when it worked, and a
    reason when it did not. Three states rather than a boolean, because the
    screen has to say something different for each: too far is the driver's
    problem to solve by driving, no fix is not.
  */
  const [where, setWhere] = useState<{ fix: Fix; distanceM: number } | null>(null);
  const [fixState, setFixState] = useState<'checking' | 'ok' | FixFailure>('checking');

  const takeFix = useCallback(async () => {
    if (!stop || stop.latitude === null || stop.longitude === null) return;
    setFixState('checking');
    const result = await currentFix();
    if (!result.ok) {
      setWhere(null);
      setFixState(result.reason);
      return;
    }
    setWhere({
      fix: result.fix,
      distanceM: metresBetween(result.fix, {
        latitude: stop.latitude,
        longitude: stop.longitude,
      }),
    });
    setFixState('ok');
  }, [stop]);

  /*
    Taken on open, not on the button press. The driver should know whether they
    are close enough BEFORE they reach for a button that then refuses them —
    and a fix can take ten seconds on a cold GPS, which is a long time to hold
    a thumb on a screen waiting.
  */
  useEffect(() => {
    if (stop?.arrivedAt) return;
    takeFix().catch(() => setFixState('unavailable'));
  }, [takeFix, stop?.arrivedAt]);

  /** A kilometre. Wide enough for a big yard, tight enough to mean something. */
  const ARRIVAL_RADIUS_M = 1000;
  const tooFar = fixState === 'ok' && where !== null && where.distanceM > ARRIVAL_RADIUS_M;
  /*
    Blocked only when we KNOW they are far. Not knowing is not the same as
    being in the wrong place, and treating it the same would strand a driver
    for standing under a steel roof.
  */
  const blocked = hasLocation && (fixState === 'checking' || tooFar);

  async function markArrived() {
    if (!stop) return;
    setSaving(true);
    setFailure(null);
    try {
      /*
       * The moment the driver tapped, not the moment the write lands. A stop
       * marked from a yard with no signal is still an arrival at the time it
       * happened, and the office reads these times to plan the rest of the
       * day.
       */
      /*
       * The measured position goes up with the arrival, so the office can see
       * where the driver actually was. Null when it could not be taken, which
       * the console shows as unverified rather than pretending.
       */
      await api.markStopArrived(
        stop.id,
        new Date().toISOString(),
        where
          ? {
              latitude: where.fix.latitude,
              longitude: where.fix.longitude,
              distanceM: where.distanceM,
            }
          : null,
      );
      await refresh();
      setConfirming(false);
      navigation.goBack();
    } catch {
      setConfirming(false);
      setFailure(routeScreen.failed);
    } finally {
      setSaving(false);
    }
  }

  if (!stop) {
    return (
      <View style={[BaseStyle.flex, styles.ground]}>
        <View style={styles.body}>
          <EmptyState icon={icons.pin} title={routeScreen.empty} hint={routeScreen.emptyHint} />
        </View>
      </View>
    );
  }

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.head]}>
          <View style={[BaseStyle.alignJustifyCenter, styles.pin]}>
            <Text
              style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium1x, styles.pinText]}>
              {stop.sequence}
            </Text>
          </View>
          <View style={BaseStyle.flex}>
            <Text style={[fontStyle.fontSizeSmall1x, styles.eyebrow]}>
              {t.sequence(stop.sequence)}
            </Text>
            <Text
              style={[fontStyle.fontSizeLargeX, fontStyle.fontWeightMedium1x, styles.title]}>
              {stop.name}
            </Text>
          </View>
        </View>

        {Boolean(stop.arrivedAt) && (
          <View
            style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.done]}>
            <AppIcon name={icons.checkCircle} size={18} color={okColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.doneText]}>
              {/* Whether it was checked, not just when. An arrival with no
                  position behind it is a different record, and the driver
                  should see the same thing the office does. */}
              {`${routeScreen.arrivedAt(formatTime(stop.arrivedAt!))} · ${
                stop.arrivedDistanceM === null
                  ? t.unverified
                  : t.verified(formatDistance(stop.arrivedDistanceM))
              }`}
            </Text>
          </View>
        )}

        <Card style={styles.card}>
          <Text style={[fontStyle.fontSizeSmall1x, fontStyle.fontWeightMedium, styles.rowLabel]}>
            {t.address.toUpperCase()}
          </Text>
          <Text style={[fontStyle.fontSizeNormal1x, styles.rowValue]}>
            {stop.address ?? common.dash}
          </Text>

          <Text style={[fontStyle.fontSizeSmall1x, fontStyle.fontWeightMedium, styles.rowLabel]}>
            {t.window.toUpperCase()}
          </Text>
          <Text style={[fontStyle.fontSizeNormal1x, styles.rowValue]}>
            {stop.windowStartAt && stop.windowEndAt
              ? routeScreen.window(
                  formatTime(stop.windowStartAt),
                  formatTime(stop.windowEndAt),
                )
              : routeScreen.noWindow}
          </Text>

          <Text style={[fontStyle.fontSizeSmall1x, fontStyle.fontWeightMedium, styles.rowLabel]}>
            {t.status.toUpperCase()}
          </Text>
          <Text style={[fontStyle.fontSizeNormal1x, styles.rowValueLast]}>
            {stop.arrivedAt ? t.alreadyArrived : t.waiting}
          </Text>
        </Card>

        {/*
          Where the driver is, before they reach for the button.
         
          Four different things to say, and only one of them is "no". Being
          unable to check is not the same as being in the wrong place, so it
          gets its own wording and does not block anything — the arrival is
          just recorded as unverified and the office can see that.
        */}
        {!stop.arrivedAt && hasLocation && (
          <View
            style={[
              BaseStyle.flexDirectionRow,
              BaseStyle.alignItemsCenter,
              styles.fix,
              fixState === 'checking'
                ? styles.fixNeutral
                : tooFar
                  ? styles.fixBad
                  : fixState === 'ok'
                    ? styles.fixGood
                    : styles.fixUnknown,
            ]}>
            {fixState === 'checking' ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <AppIcon
                name={tooFar ? icons.warning : fixState === 'ok' ? icons.checkCircle : icons.alert}
                size={18}
                color={tooFar ? dangerColor : fixState === 'ok' ? okColor : warnColor}
              />
            )}
            <Text
              style={[
                fontStyle.fontSizeSmall2x,
                styles.fixText,
                {
                  color:
                    fixState === 'checking'
                      ? textMuted
                      : tooFar
                        ? dangerColor
                        : fixState === 'ok'
                          ? okColor
                          : warnColor,
                },
              ]}>
              {fixState === 'checking'
                ? t.checking
                : fixState === 'ok' && where
                  ? tooFar
                    ? t.tooFar(formatDistance(where.distanceM))
                    : t.closeEnough(formatDistance(where.distanceM))
                  : fixState === 'denied'
                    ? t.denied
                    : t.noFix}
            </Text>
          </View>
        )}

        {/* Only offered when checking failed or put them out of range — there
            is nothing to retry when it worked. */}
        {!stop.arrivedAt && hasLocation && fixState !== 'checking' && (
          <CustomButton
            title={t.retryFix}
            icon={icons.refresh}
            variant="ghost"
            style={styles.retry}
            onPress={() => {
              takeFix().catch(() => setFixState('unavailable'));
            }}
          />
        )}

        {hasLocation ? (
          <CustomButton
            title={t.openInMap}
            icon={icons.pin}
            variant="outline"
            style={styles.mapButton}
            onPress={() => {
              if (route) navigation.navigate('RouteMap', { routeId: route.id });
            }}
          />
        ) : (
          <Text style={[fontStyle.fontSizeSmall1x, styles.noLocation]}>{t.noLocation}</Text>
        )}

        {Boolean(failure) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{failure}</Text>
          </View>
        )}

        {!stop.arrivedAt && (
          <CustomButton
            title={t.markArrived}
            icon={icons.check}
            disabled={blocked}
            style={styles.submit}
            onPress={() => setConfirming(true)}
          />
        )}
      </ScrollView>

      <ConfirmModal
        visible={confirming}
        title={t.arrivedConfirm}
        message={
          where
            ? `${t.arrivedHint} ${t.verified(formatDistance(where.distanceM))}`
            : `${t.arrivedHint} ${t.unverified}`
        }
        confirmLabel={t.markArrived}
        icon={icons.pin}
        loading={saving}
        onConfirm={() => {
          markArrived().catch(() => {});
        }}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.ExtraLarge },

  head: { paddingTop: spacings.large },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: accentColor,
    marginRight: spacings.large,
  },
  pinText: { color: onAccent },
  eyebrow: { color: textFaint, letterSpacing: 0.6 },
  title: { color: textDark, marginTop: spacings.xxsmall },

  done: {
    backgroundColor: okSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  doneText: { color: okColor, marginLeft: spacings.normalx, flex: 1 },

  card: { marginTop: spacings.large },
  rowLabel: { color: textFaint, letterSpacing: 0.8, marginTop: spacings.large },
  rowValue: { color: textBody, marginTop: spacings.xxsmall, lineHeight: hp(2.6) },
  rowValueLast: {
    color: textBody,
    marginTop: spacings.xxsmall,
    marginBottom: spacings.normal,
    lineHeight: hp(2.6),
  },

  fix: {
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  fixNeutral: { backgroundColor: cardBgSoft },
  fixGood: { backgroundColor: okSoft },
  fixBad: { backgroundColor: dangerSoft },
  fixUnknown: { backgroundColor: warnSoft },
  fixText: { marginLeft: spacings.normalx, flex: 1, lineHeight: hp(2.3) },
  retry: { marginTop: spacings.normal },

  mapButton: { marginTop: spacings.large },
  noLocation: {
    color: textMuted,
    marginTop: spacings.large,
    textAlign: 'center',
    lineHeight: hp(2.3),
  },

  error: {
    backgroundColor: dangerSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
  submit: { marginTop: spacings.xxLarge },
});
