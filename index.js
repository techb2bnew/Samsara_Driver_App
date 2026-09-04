/**
 * @format
 */

// Must be the first import in the app. react-native-gesture-handler patches
// the touch system on Android, and anything that renders before this is
// registered gets the unpatched one — gestures then work in dev and silently
// fail in a release build.
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
