import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { InspectHomeScreen } from '../screens/inspect/InspectHomeScreen';
import { InspectionFormScreen } from '../screens/inspect/InspectionFormScreen';
import { ReportFaultScreen } from '../screens/inspect/ReportFaultScreen';
import { MyRepairsScreen } from '../screens/inspect/MyRepairsScreen';
import { homeScreenOptions, nestedScreenOptions } from './screenOptions';
import { screenTitles } from '../constans/Constants';
import type { InspectStackParams } from './types';

const Stack = createNativeStackNavigator<InspectStackParams>();

/**
 * The Inspect tab.
 *
 * ReportFault is a sheet because it is reached two ways — from inside an
 * inspection, and on its own when something breaks mid-route. Both should
 * return the driver to whatever they were doing.
 */
export function InspectStack() {
  return (
    <Stack.Navigator screenOptions={nestedScreenOptions}>
      <Stack.Screen name="InspectHome" component={InspectHomeScreen} options={homeScreenOptions} />
      <Stack.Screen
        name="InspectionForm"
        component={InspectionFormScreen}
        options={{ title: screenTitles.inspectionForm }}
      />
      <Stack.Screen
        name="ReportFault"
        component={ReportFaultScreen}
        options={{ title: screenTitles.reportFault, presentation: 'modal' }}
      />
      <Stack.Screen
        name="MyRepairs"
        component={MyRepairsScreen}
        options={{ title: screenTitles.myRepairs }}
      />
    </Stack.Navigator>
  );
}
