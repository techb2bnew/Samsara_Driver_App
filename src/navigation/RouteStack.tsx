import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RouteHomeScreen } from '../screens/route/RouteHomeScreen';
import { StopDetailScreen } from '../screens/route/StopDetailScreen';
import { RouteMapScreen } from '../screens/route/RouteMapScreen';
import { AddPaperworkScreen } from '../screens/me/AddPaperworkScreen';
import { homeScreenOptions, nestedScreenOptions } from './screenOptions';
import { screenTitles } from '../constans/Constants';
import type { RouteStackParams } from './types';

const Stack = createNativeStackNavigator<RouteStackParams>();

/** The Route tab: the stop list, one stop, and the whole route drawn out. */
export function RouteStack() {
  return (
    <Stack.Navigator screenOptions={nestedScreenOptions}>
      <Stack.Screen name="RouteHome" component={RouteHomeScreen} options={homeScreenOptions} />
      <Stack.Screen
        name="StopDetail"
        component={StopDetailScreen}
        options={{ title: screenTitles.stopDetail }}
      />
      <Stack.Screen
        name="AddPaperwork"
        component={AddPaperworkScreen}
        options={{ title: screenTitles.addPaperwork, presentation: 'modal' }}
      />
      <Stack.Screen
        name="RouteMap"
        component={RouteMapScreen}
        options={{ title: screenTitles.routeMap }}
      />
    </Stack.Navigator>
  );
}
