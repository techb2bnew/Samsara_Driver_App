import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { VerifyOtpScreen } from '../screens/auth/VerifyOtpScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { appBg } from '../constans/Color';
import type { AuthStackParams } from './types';

const Stack = createNativeStackNavigator<AuthStackParams>();

/**
 * Sign in, and the three steps of a password reset.
 *
 * No headers — each screen carries its own title and its own back button, so
 * the layout is the same whether it was reached from login or reopened after a
 * failed verify.
 */
export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: appBg },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}
