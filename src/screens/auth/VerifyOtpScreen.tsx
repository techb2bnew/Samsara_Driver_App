import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthShell, CustomButton, OtpInput, icons } from '../../components';
import { spacings } from '../../constans/Fonts';
import { auth as t } from '../../constans/Constants';
import * as api from '../../supabase/api';
import type { AuthStackParams } from '../../navigation/types';

const CODE_LENGTH = 6;

type Props = NativeStackScreenProps<AuthStackParams, 'VerifyOtp'>;

/**
 * Step 2 of 3: the code from the email.
 *
 * Verifying a recovery code SIGNS THE DRIVER IN — that is how Supabase's reset
 * flow works, and it is why the next screen can change the password without
 * asking for the old one. The root navigator would normally swap to the app
 * the moment a session appears, so it deliberately keeps this stack mounted
 * while a reset is in progress. See RootNavigator.
 */
export function VerifyOtpScreen({ navigation, route }: Props) {
  const { email } = route.params;

  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify() {
    if (code.length < CODE_LENGTH) {
      setError(t.otp.tooShort);
      return;
    }

    setError(undefined);
    setBusy(true);
    try {
      await api.verifyResetCode(email, code);
      navigation.navigate('ResetPassword', { email });
    } catch {
      setError(t.otp.failed);
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(undefined);
    try {
      await api.sendResetCode(email);
      setCode('');
    } catch {
      setError(t.forgot.failed);
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell
      icon={icons.shield}
      title={t.otp.title}
      subtitle={t.otp.subtitle(email)}
      onBack={() => navigation.goBack()}>
      <OtpInput
        value={code}
        onChangeText={next => {
          setCode(next);
          if (error) setError(undefined);
        }}
        length={CODE_LENGTH}
        error={error}
      />

      <CustomButton
        title={t.otp.submit}
        onPress={() => { handleVerify(); }}
        loading={busy}
        disabled={code.length < CODE_LENGTH}
        style={styles.verify}
      />
      <CustomButton
        title={t.otp.resend}
        variant="ghost"
        loading={resending}
        disabled={busy}
        onPress={() => { handleResend(); }}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  verify: { marginTop: spacings.xxxLarge },
});
