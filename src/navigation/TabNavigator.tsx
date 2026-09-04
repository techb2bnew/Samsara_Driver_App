import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppIcon, icons } from '../components';
import { DutyStack } from './DutyStack';
import { RouteStack } from './RouteStack';
import { InspectStack } from './InspectStack';
import { MessagesStack } from './MessagesStack';
import { MeStack } from './MeStack';
import { spacings, style as fontStyle } from '../constans/Fonts';
import {
  accentColor,
  borderColor,
  cardBg,
  onAccent,
  shadowColor,
  textMuted,
} from '../constans/Color';
import { tabs } from '../constans/Constants';
import { heightPercentageToDP as hp } from '../utils';
import { useNotifications } from '../context/NotificationContext';
import type { TabParams } from './types';

const Tab = createBottomTabNavigator<TabParams>();

/**
 * The signed-in app: five tabs, each hosting its own stack.
 *
 * Stacks rather than screens, because every tab has somewhere to go — a stop
 * from the route, a form from Inspect, seven screens from Me. Hosting the
 * screens directly would mean either one shared stack (so each tab forgets
 * where it was when you leave it) or no navigation inside a tab at all.
 *
 * Five is the ceiling. A driver taps these one-handed, sometimes with gloves,
 * in a moving cab; six makes each target narrower than a thumb. Anything that
 * does not earn a tab lives inside Me.
 */

/**
 * Icon components built once, outside the navigator.
 *
 * An inline `tabBarIcon` closure is a new component type on every render, so
 * React discards the tab and rebuilds it — taking the stack's position with
 * it. One factory, five stable functions.
 */
function tabIcon(idle: string, active: string) {
  return function TabBarIcon({ focused, color }: { focused: boolean; color: string }) {
    return <AppIcon name={focused ? active : idle} size={23} color={color} />;
  };
}

const DUTY_ICON = tabIcon(icons.duty, icons.dutyActive);
const ROUTE_ICON = tabIcon(icons.route, icons.routeActive);
const INSPECT_ICON = tabIcon(icons.inspect, icons.inspectActive);
const MESSAGES_ICON = tabIcon(icons.messages, icons.messagesActive);
const ME_ICON = tabIcon(icons.me, icons.meActive);

export function TabNavigator() {
  const { unreadMessages, unreadCount } = useNotifications();

  return (
    <Tab.Navigator
      screenOptions={{
        // Each stack draws its own headers. A tab header on top of a stack
        // header is two bars saying the same thing.
        headerShown: false,
        tabBarActiveTintColor: accentColor,
        tabBarInactiveTintColor: textMuted,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}>
      <Tab.Screen
        name="DutyTab"
        component={DutyStack}
        options={{ tabBarLabel: tabs.duty, tabBarIcon: DUTY_ICON }}
      />
      <Tab.Screen
        name="RouteTab"
        component={RouteStack}
        options={{ tabBarLabel: tabs.route, tabBarIcon: ROUTE_ICON }}
      />
      <Tab.Screen
        name="InspectTab"
        component={InspectStack}
        options={{ tabBarLabel: tabs.inspect, tabBarIcon: INSPECT_ICON }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStack}
        options={{
          tabBarLabel: tabs.messages,
          tabBarIcon: MESSAGES_ICON,
          // undefined, not 0 — react-navigation renders a badge for any
          // defined value, so a zero would show an empty red dot forever.
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tab.Screen
        name="MeTab"
        component={MeStack}
        options={{
          tabBarLabel: tabs.me,
          tabBarIcon: ME_ICON,
          // Notifications live inside Me, so the count surfaces on the tab
          // that leads there. A dot rather than a number: the driver has to
          // open the list either way, and the exact figure is on the row.
          tabBarBadge: unreadCount > 0 ? '' : undefined,
          tabBarBadgeStyle: styles.dot,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: cardBg,
    borderTopColor: borderColor,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: hp(10),
    paddingTop: spacings.normalx,
    shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  label: {
    ...StyleSheet.flatten(fontStyle.fontSizeSmall),
    ...StyleSheet.flatten(fontStyle.fontWeightThin1x),
    marginBottom: spacings.normalx,
  },
  item: { paddingVertical: spacings.xsmall },
  badge: {
    backgroundColor: accentColor,
    color: onAccent,
    ...StyleSheet.flatten(fontStyle.fontSizeExtraExtraSmall),
    ...StyleSheet.flatten(fontStyle.fontWeightMedium),
  },
  dot: { backgroundColor: accentColor, minWidth: 9, maxHeight: 9, borderRadius: 5 },
});
