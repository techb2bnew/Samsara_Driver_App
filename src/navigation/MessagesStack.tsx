import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MessagesHomeScreen } from '../screens/messages/MessagesHomeScreen';
import { homeScreenOptions, nestedScreenOptions } from './screenOptions';
import type { MessagesStackParams } from './types';

const Stack = createNativeStackNavigator<MessagesStackParams>();

/**
 * The Messages tab.
 *
 * One screen today and still a stack, on purpose: an attachment viewer and a
 * broadcast detail both belong in here, and adding a stack later means moving
 * the screen and rewriting every navigate call to it.
 */
export function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={nestedScreenOptions}>
      <Stack.Screen
        name="MessagesHome"
        component={MessagesHomeScreen}
        options={homeScreenOptions}
      />
    </Stack.Navigator>
  );
}
