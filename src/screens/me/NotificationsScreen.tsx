import React, { useLayoutEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppIcon, EmptyState, icons } from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  accentSoft,
  appBg,
  cardBg,
  dutyDrivingColor,
  dutyOnDutyColor,
  okSoft,
  shadowColor,
  textDark,
  textFaint,
  textMuted,
  warnSoft,
} from '../../constans/Color';
import { notifications as t } from '../../constans/Constants';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';
import { useNotifications } from '../../context/NotificationContext';
import type { DriverNotification } from '../../context/NotificationContext';

const ICON: Record<DriverNotification['kind'], string> = {
  message: icons.messages,
  route: icons.route,
  vehicle: icons.truck,
};

const TONE: Record<DriverNotification['kind'], { color: string; wash: string }> = {
  message: { color: accentColor, wash: accentSoft },
  route: { color: dutyDrivingColor, wash: okSoft },
  vehicle: { color: dutyOnDutyColor, wash: warnSoft },
};

/** "14:35" — anything older than today is rare enough to read in full. */
function whenOf(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return sameDay
    ? time
    : `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${time}`;
}

/**
 * What the office has done to this driver.
 *
 * Everything here is somebody else's action — a route assigned, a truck
 * changed, a message sent. The driver's own duty events and inspections are
 * not in the list, because they did those and already know.
 *
 * Mark-all lives in the header, not as a full-width form button. A driver
 * opening this screen is already looking at the list; a giant outline control
 * above it is the wrong shape for "I've seen these".
 */
export function NotificationsScreen() {
  const navigation = useNavigation();
  const { items, unreadCount, unreadIds, markAllRead, refresh } = useNotifications();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight:
        unreadCount > 0
          ? () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.markAllRead}
                onPress={markAllRead}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}>
                <AppIcon name={icons.check} size={16} color={accentColor} />
                <Text
                  style={[
                    fontStyle.fontSizeSmall2x,
                    fontStyle.fontWeightMedium,
                    styles.headerBtnText,
                  ]}>
                  {t.markAllRead}
                </Text>
              </Pressable>
            )
          : undefined,
    });
  }, [navigation, unreadCount, markAllRead]);

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} tintColor={accentColor} />
        }>
        {items.length === 0 ? (
          <EmptyState icon={icons.bell} title={t.empty} hint={t.emptyHint} />
        ) : (
          <>
            {unreadCount > 0 && (
              <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.kicker]}>
                {t.unread(unreadCount).toUpperCase()}
              </Text>
            )}

            <View>
              {items.map(item => {
                const tone = TONE[item.kind];
                const isUnread = unreadIds.has(item.id);
                return (
                  <View key={item.id} style={styles.card}>
                    {isUnread && <View style={styles.unreadBar} />}
                    <View style={[BaseStyle.flexDirectionRow, styles.cardBody]}>
                    <View
                      style={[
                        BaseStyle.alignJustifyCenter,
                        styles.badge,
                        { backgroundColor: tone.wash },
                      ]}>
                      <AppIcon name={ICON[item.kind]} size={18} color={tone.color} />
                    </View>
                    <View style={BaseStyle.flex}>
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
                            styles.title,
                          ]}>
                          {item.title}
                        </Text>
                        <Text style={[fontStyle.fontSizeExtraSmall, styles.when]}>
                          {whenOf(item.at)}
                        </Text>
                      </View>
                      <Text style={[fontStyle.fontSizeSmall2x, styles.bodyText]}>{item.body}</Text>
                    </View>
                    {isUnread && <View style={styles.dot} />}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: {
    paddingHorizontal: spacings.xxLarge,
    paddingTop: spacings.large,
    paddingBottom: spacings.ExtraLarge,
  },
  pressed: { opacity: 0.7 },

  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: accentSoft,
    borderRadius: 99,
    paddingVertical: spacings.small,
    paddingHorizontal: spacings.large,
    marginRight: spacings.xsmall,
  },
  headerBtnText: { color: accentColor, marginLeft: spacings.small },

  kicker: {
    color: textFaint,
    letterSpacing: 1.1,
    marginBottom: spacings.large,
  },
  card: {
    backgroundColor: cardBg,
    borderRadius: 14,
    marginBottom: spacings.large,
    overflow: 'hidden',
    shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: accentColor,
  },
  cardBody: {
    padding: spacings.xxLarge,
  },
  badge: {
    width: wp(9.5),
    height: wp(9.5),
    borderRadius: 12,
    marginRight: spacings.large,
  },
  title: { color: textDark, flex: 1, marginRight: spacings.normal },
  when: { color: textFaint },
  bodyText: { color: textMuted, marginTop: spacings.xxsmall, lineHeight: hp(2.4) },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: accentColor,
    marginLeft: spacings.normal,
    marginTop: spacings.normal,
  },
});
