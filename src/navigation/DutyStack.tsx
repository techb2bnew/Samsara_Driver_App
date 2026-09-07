import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DutyHomeScreen } from '../screens/duty/DutyHomeScreen';
import { VehiclePickerScreen } from '../screens/duty/VehiclePickerScreen';
import { DayLogScreen } from '../screens/duty/DayLogScreen';
import { RequestCorrectionScreen } from '../screens/me/RequestCorrectionScreen';
import { TrainingScreen } from '../screens/me/TrainingScreen';
import { CourseScreen } from '../screens/me/CourseScreen';
import { NotificationsScreen } from '../screens/me/NotificationsScreen';
import { homeScreenOptions, nestedScreenOptions } from './screenOptions';
import { screenTitles } from '../constans/Constants';
import type { DutyStackParams } from './types';

const Stack = createNativeStackNavigator<DutyStackParams>();

/**
 * The Duty tab.
 *
 * The vehicle picker is presented as a sheet rather than pushed: picking a
 * truck is a decision that returns you to where you were, and a full-screen
 * push implies you have gone somewhere.
 */
export function DutyStack() {
  return (
    <Stack.Navigator screenOptions={nestedScreenOptions}>
      <Stack.Screen name="DutyHome" component={DutyHomeScreen} options={homeScreenOptions} />
      <Stack.Screen
        name="VehiclePicker"
        component={VehiclePickerScreen}
        options={{ title: screenTitles.vehiclePicker, presentation: 'modal' }}
      />
      <Stack.Screen
        name="DayLog"
        component={DayLogScreen}
        options={{ title: screenTitles.dayLog }}
      />
      <Stack.Screen
        name="Training"
        component={TrainingScreen}
        options={{ title: screenTitles.training }}
      />
      <Stack.Screen
        name="Course"
        component={CourseScreen}
        options={{ title: screenTitles.course }}
      />
      <Stack.Screen
        name="RequestCorrection"
        component={RequestCorrectionScreen}
        options={{ title: screenTitles.requestCorrection, presentation: 'modal' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: screenTitles.notifications }}
      />
    </Stack.Navigator>
  );
}
