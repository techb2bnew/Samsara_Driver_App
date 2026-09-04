import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MeHomeScreen } from '../screens/me/MeHomeScreen';
import { MyLogsScreen } from '../screens/me/MyLogsScreen';
import { MyInspectionsScreen } from '../screens/me/MyInspectionsScreen';
import { MyFaultsScreen } from '../screens/me/MyFaultsScreen';
import { MyViolationsScreen } from '../screens/me/MyViolationsScreen';
import { MyDocumentsScreen } from '../screens/me/MyDocumentsScreen';
import { TrainingScreen } from '../screens/me/TrainingScreen';
import { RequestCorrectionScreen } from '../screens/me/RequestCorrectionScreen';
import { SettingsScreen } from '../screens/me/SettingsScreen';
import { NotificationsScreen } from '../screens/me/NotificationsScreen';
import { homeScreenOptions, nestedScreenOptions } from './screenOptions';
import { screenTitles } from '../constans/Constants';
import type { MeStackParams } from './types';

const Stack = createNativeStackNavigator<MeStackParams>();

/**
 * The Me tab, which is where everything that did not earn a tab lives.
 *
 * Deliberately the deepest stack. Five tabs is the ceiling for a cab, so
 * history, violations, training, documents and settings are all one level in
 * from here rather than competing for space along the bottom.
 */
export function MeStack() {
  return (
    <Stack.Navigator screenOptions={nestedScreenOptions}>
      <Stack.Screen name="MeHome" component={MeHomeScreen} options={homeScreenOptions} />
      <Stack.Screen
        name="MyLogs"
        component={MyLogsScreen}
        options={{ title: screenTitles.myLogs }}
      />
      <Stack.Screen
        name="MyInspections"
        component={MyInspectionsScreen}
        options={{ title: screenTitles.myInspections }}
      />
      <Stack.Screen
        name="MyFaults"
        component={MyFaultsScreen}
        options={{ title: screenTitles.myFaults }}
      />
      <Stack.Screen
        name="MyViolations"
        component={MyViolationsScreen}
        options={{ title: screenTitles.myViolations }}
      />
      <Stack.Screen
        name="MyDocuments"
        component={MyDocumentsScreen}
        options={{ title: screenTitles.myDocuments }}
      />
      <Stack.Screen
        name="Training"
        component={TrainingScreen}
        options={{ title: screenTitles.training }}
      />
      <Stack.Screen
        name="RequestCorrection"
        component={RequestCorrectionScreen}
        options={{ title: screenTitles.requestCorrection, presentation: 'modal' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: screenTitles.settings }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: screenTitles.notifications }}
      />
    </Stack.Navigator>
  );
}
