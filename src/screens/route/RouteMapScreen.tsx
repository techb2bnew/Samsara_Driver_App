import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type MapViewProps } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon, EmptyState, icons } from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  appBg,
  cardBg,
  okColor,
  onAccent,
  shadowColor,
  textDark,
  textMuted,
} from '../../constans/Color';
import { routeScreen as t } from '../../constans/Constants';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';
import type { LatLng } from '../../supabase/api';
import { useShift } from '../../context/ShiftContext';
import type { RouteStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<RouteStackParams, 'RouteMap'>;

/** Room around the route so pins are not under the edge of the screen. */
const EDGE_PADDING = { top: 80, right: 60, bottom: 200, left: 60 };

/**
 * The whole route drawn out, with the stops and where the driver is.
 *
 * Read-only. The line is what the office planned; a driver correcting it here
 * would be editing dispatch's work from the cab, and the stops are the thing
 * they actually mark off.
 *
 * The blue dot is the map's own `showsUserLocation`, not a geolocation library.
 * The native map already has a location client, and adding one here to draw a
 * dot would mean a second permission flow doing the same job.
 */
export function RouteMapScreen({ route: navRoute }: Props) {
  const { routeId } = navRoute.params;
  const { route: assigned, loading } = useShift();
  const mapRef = useRef<MapView>(null);
  const [ready, setReady] = useState(false);

  // The screen is reached from this route, but the driver could in principle
  // be moved off it between screens. Better an empty map than another's route.
  const routeData = assigned?.id === routeId ? assigned : null;

  const stopPoints = useMemo<LatLng[]>(
    () =>
      (routeData?.stops ?? [])
        .filter(s => s.latitude !== null && s.longitude !== null)
        .map(s => ({ latitude: s.latitude as number, longitude: s.longitude as number })),
    [routeData],
  );

  /*
   * The road path when the office planned one, otherwise the stops joined up.
   * A straight line between stops is honest and useful — it shows the order
   * and roughly where the day goes — as long as the screen says that is what
   * it is, which the banner below does.
   */
  const line = routeData?.path.length ? routeData.path : stopPoints;
  const straightLine = !routeData?.path.length && stopPoints.length > 1;

  const fit = () => {
    const points = line.length > 1 ? line : stopPoints;
    if (points.length === 0) return;
    if (points.length === 1) {
      mapRef.current?.animateToRegion({
        ...points[0],
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
      return;
    }
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: EDGE_PADDING,
      animated: true,
    });
  };

  if (loading && !assigned) {
    return (
      <View style={[BaseStyle.flex, BaseStyle.alignJustifyCenter, styles.ground]}>
        <ActivityIndicator color={accentColor} />
      </View>
    );
  }

  if (stopPoints.length === 0 && line.length === 0) {
    return (
      <View style={[BaseStyle.flex, styles.ground]}>
        <EmptyState icon={icons.route} title={t.mapEmpty} hint={t.mapEmptyHint} />
      </View>
    );
  }

  const first = line[0] ?? stopPoints[0];

  return (
    <View style={BaseStyle.flex}>
      <MapView
        ref={mapRef}
        style={BaseStyle.flex}
        // Google on Android; iOS uses Apple Maps, which needs no key.
        {...(Platform.OS === 'android'
          ? ({ provider: PROVIDER_GOOGLE } as MapViewProps)
          : {})}
        initialRegion={{
          ...first,
          latitudeDelta: 0.25,
          longitudeDelta: 0.25,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onMapReady={() => {
          setReady(true);
          fit();
        }}>
        {line.length > 1 && (
          <Polyline
            coordinates={line}
            strokeColor={accentColor}
            strokeWidth={4}
            // Dashed when it is not a real road path, so the line never claims
            // to be a route the truck can drive.
            lineDashPattern={straightLine ? [10, 8] : undefined}
          />
        )}

        {(routeData?.stops ?? [])
          .filter(s => s.latitude !== null && s.longitude !== null)
          .map(stop => {
            const arrived = stop.arrivedAt !== null;
            return (
              <Marker
                key={stop.id}
                coordinate={{
                  latitude: stop.latitude as number,
                  longitude: stop.longitude as number,
                }}
                title={`${stop.sequence}. ${stop.name}`}
                description={stop.address ?? undefined}
                // Custom pin rather than the platform one: the sequence number
                // is the whole point — a driver needs the ORDER, and eight
                // identical pins do not give it.
                tracksViewChanges={false}>
                <View
                  style={[
                    BaseStyle.alignJustifyCenter,
                    styles.pin,
                    arrived && styles.pinDone,
                  ]}>
                  <Text
                    style={[
                      fontStyle.fontSizeSmall,
                      fontStyle.fontWeightMedium1x,
                      styles.pinText,
                    ]}>
                    {stop.sequence}
                  </Text>
                </View>
              </Marker>
            );
          })}
      </MapView>

      {/* --------------------------------------------------------- controls */}
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.mapRecentre}
          disabled={!ready}
          onPress={fit}
          style={({ pressed }) => [
            BaseStyle.alignJustifyCenter,
            styles.controlButton,
            pressed && styles.pressed,
          ]}>
          <AppIcon name="scan-outline" size={20} color={textDark} />
        </Pressable>
      </View>

      {/* ------------------------------------------------------------ legend */}
      <View style={styles.sheet}>
        <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter]}>
          <View style={BaseStyle.flex}>
            <Text style={[fontStyle.fontSizeNormal2x, fontStyle.fontWeightMedium, styles.ref]}>
              {routeData?.reference ?? ''}
            </Text>
            <Text style={[fontStyle.fontSizeSmall2x, styles.meta]}>
              {[
                t.mapStops(stopPoints.length),
                routeData?.plannedDistanceKm
                  ? t.mapDistance(Math.round(routeData.plannedDistanceKm))
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <AppIcon name={icons.route} size={22} color={accentColor} />
        </View>

        {straightLine && (
          <Text style={[fontStyle.fontSizeSmall1x, styles.warning]}>{t.mapStraightLine}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  pressed: { opacity: 0.7 },

  pin: {
    width: wp(7.5),
    height: wp(7.5),
    borderRadius: wp(3.75),
    backgroundColor: accentColor,
    borderWidth: 2,
    borderColor: cardBg,
  },
  pinDone: { backgroundColor: okColor },
  pinText: { color: onAccent },

  controls: { position: 'absolute', right: spacings.large, top: spacings.large },
  controlButton: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: cardBg,
    shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  sheet: {
    position: 'absolute',
    left: spacings.large,
    right: spacings.large,
    bottom: spacings.large,
    backgroundColor: cardBg,
    borderRadius: 20,
    padding: spacings.xxLarge,
    shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  ref: { color: textDark },
  meta: { color: textMuted, marginTop: spacings.xxsmall },
  warning: { color: textMuted, marginTop: spacings.normalx, lineHeight: hp(2.4) },
});
