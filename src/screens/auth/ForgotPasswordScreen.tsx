import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthShell, CustomButton, CustomTextInput, icons } from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import { dangerColor, dangerSoft } from '../../constans/Color';
import { auth as t } from '../../constans/Constants';
import { validateEmail } from '../../validation';
import * as api from '../../supabase/api';
import type { AuthStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParams, 'ForgotPassword'>;

/** Step 1 of 3: which account. */
export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    const next = validateEmail(email);
    if (next) {
      setError(next);
      return;
    }

    setError(undefined);
    setFailure(null);
    setBusy(true);
    try {
      await api.sendResetCode(email.trim());
      navigation.navigate('VerifyOtp', { email: email.trim() });
    } catch {
      setFailure(t.forgot.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      icon={icons.mail}
      title={t.forgot.title}
      subtitle={t.forgot.subtitle}
      onBack={() => navigation.goBack()}>
      <CustomTextInput
        label={t.forgot.emailLabel}
        required
        placeholder={t.signIn.emailPlaceholder}
        icon={icons.mail}
        value={email}
        onChangeText={next => {
          setEmail(next);
          if (error) setError(undefined);
          if (failure) setFailure(null);
        }}
        onBlur={() => {
          if (!email.trim()) return;
          const next = validateEmail(email);
          if (next) setError(next);
        }}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="done"
        onSubmitEditing={() => {
          handleSubmit();
        }}
        error={error}
      />

      {Boolean(failure) && (
        <View style={[BaseStyle.borderRadius8, styles.failure]}>
          <Text style={[fontStyle.fontSizeSmall2x, styles.failureText]}>{failure}</Text>
        </View>
      )}

      <CustomButton title={t.forgot.submit} onPress={() => { handleSubmit(); }} loading={busy} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  failure: {
    backgroundColor: dangerSoft,
    paddingVertical: spacings.normalx,
    paddingHorizontal: spacings.large,
    marginBottom: spacings.large,
  },
  failureText: { color: dangerColor },
});
