/**
 * Samsara Driver.
 *
 * @format
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { BaseStyle } from './src/constans/Style';

/**
 * GestureHandlerRootView has to be the outermost view, above the navigator —
 * react-navigation's stack gestures are children of it. SafeAreaProvider sits
 * inside so every screen can read the insets.
 */
function App() {
  return (
    <GestureHandlerRootView style={BaseStyle.flex}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
