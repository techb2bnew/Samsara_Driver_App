import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Card,
  CustomButton,
  EmptyState,
  ListRow,
  icons,
} from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  appBg,
  dutyDrivingColor,
  dutyOnDutyColor,
  textMuted,
} from '../../constans/Color';
import { notifications as t } from '../../constans/Constants';
import { useNotifications } from '../../context/NotificationContext';
import type { DriverNotification } from '../../context/NotificationContext';

const ICON: Record<DriverNotification['kind'], string> = {
  message: icons.messages,
  route: icons.route,
  vehicle: icons.truck,
};

const TONE: Record<DriverNotification['kind'], string> = {
  message: accentColor,
  route: dutyDrivingColor,
  vehicle: dutyOnDutyColor,
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
 */
export function NotificationsScreen() {
  const { items, unreadCount, markAllRead } = useNotifications();

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <EmptyState icon={icons.bell} title={t.empty} hint={t.emptyHint} />
        ) : (
          <>
            {unreadCount > 0 && (
              <CustomButton
                title={t.markAllRead}
                variant="outline"
                icon={icons.check}
                onPress={markAllRead}
                style={styles.markAll}
              />
            )}

            <Card padded={false}>
              {items.map((item, i) => (
                <ListRow
                  key={item.id}
                  icon={ICON[item.kind]}
                  tone={TONE[item.kind]}
                  title={item.title}
                  detail={item.body}
                  trailing={
                    <Text style={[fontStyle.fontSizeExtraSmall, styles.when]}>
                      {whenOf(item.at)}
                    </Text>
                  }
                  last={i === items.length - 1}
                />
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { padding: spacings.xxLarge },
  markAll: { marginBottom: spacings.large },
  when: { color: textMuted },
});
