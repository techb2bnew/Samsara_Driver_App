import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { ScreenWrapper, CustomButton, BrandMark, icons } from '../components';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import { accentColor, appBg, textBody, textDark } from '../constans/Color';
import { auth as authText, common, me as meText, SPLASH_MS } from '../constans/Constants';
import { heightPercentageToDP as hp } from '../utils';
import { useAuth } from '../context/AuthContext';
import { ShiftProvider } from '../context/ShiftContext';
import { NotificationProvider } from '../context/NotificationContext';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { SplashScreen } from '../screens/SplashScreen';

const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: appBg, primary: accentColor },
};

/**
 * Which of the app you are looking at.
 *
 * Four states, and they are switched at the top rather than by navigating:
 * swapping the whole tree means a signed-out driver has no app screens left
 * mounted behind the login, and a sign-in cannot be undone with a back gesture.
 *
 *   loading      the stored session is being checked
 *   onboarding   this phone has not seen the introduction
 *   signedOut    the auth stack, including the reset flow
 *   notADriver   signed in, but the account is not linked to a driver
 *   signedIn     the tabs
 */
export function RootNavigator() {
  const { state, onboarded } = useAuth();
  const [splashHeld, setSplashHeld] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setSplashHeld(false), SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  if (state.status === 'loading' || onboarded === null) {
    return <SplashScreen />;
  }

  if (!onboarded) {
    if (splashHeld) return <SplashScreen />;
    return <OnboardingScreen />;
  }

  /*
   * Signed-in providers mount while the splash is still up, so the shift and
   * route are already on the phone when the tabs appear. Holding the splash
   * without them meant a second wait behind a spinner on every tab.
   */
  if (state.status === 'signedIn') {
    return (
      <ShiftProvider>
        <NotificationProvider>
          {splashHeld ? (
            <SplashScreen />
          ) : (
            <NavigationContainer theme={navTheme}>
              <TabNavigator />
            </NavigationContainer>
          )}
        </NotificationProvider>
      </ShiftProvider>
    );
  }

  if (splashHeld) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      {state.status === 'notADriver' ? <NotADriver /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

/**
 * A real account that is not a driver.
 *
 * Usually an office login used on the phone by mistake, or an invitation where
 * the driver row never got linked. Saying so is the whole value of this
 * screen — the alternative is an app full of empty lists and a driver
 * convinced it is broken.
 */
function NotADriver() {
  const { signOut } = useAuth();
  return (
    <ScreenWrapper>
      <View style={[BaseStyle.flex, BaseStyle.alignJustifyCenter]}>
        <BrandMark icon={icons.alert} size="md" />
        <Text
          style={[
            fontStyle.fontSizeLargeX,
            fontStyle.fontWeightMedium1x,
            BaseStyle.textAlign,
            styles.appName,
          ]}>
          {common.somethingWrong}
        </Text>
        <Text style={[fontStyle.fontSizeNormal1x, BaseStyle.textAlign, styles.message]}>
          {authText.signIn.notADriver}
        </Text>
        <CustomButton title={meText.signOut} variant="outline" onPress={() => { signOut(); }} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  appName: { color: textDark, marginTop: spacings.xxLarge, marginBottom: spacings.xLarge },
  message: {
    color: textBody,
    lineHeight: hp(2.9),
    marginBottom: spacings.xxxLarge,
  },
});
