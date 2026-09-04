import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AuthShell,
  CustomButton,
  CustomTextInput,
  SuccessModal,
  icons,
  type CustomTextInputRef,
} from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import { dangerColor, dangerSoft } from '../../constans/Color';
import { auth as t, modal } from '../../constans/Constants';
import { validateConfirmPassword, validateNewPassword } from '../../validation';
import * as api from '../../supabase/api';
import { useAuth } from '../../context/AuthContext';
import type { AuthStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParams, 'ResetPassword'>;

/**
 * Step 3 of 3: the new password.
 *
 * The code from step 2 already signed this driver in, so no old password is
 * asked for — they proved control of the mailbox, which is the whole point of
 * the code.
 *
 * On success the driver is signed OUT again before going back to the login
 * screen. That is deliberate: the reset session was created to change a
 * password, and making them use the new one once proves it works while they
 * still have it in their head.
 */
export function ResetPasswordScreen({ navigation }: Props) {
  const { signOut } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const passwordRef = useRef<CustomTextInputRef>(null);
  const confirmRef = useRef<CustomTextInputRef>(null);

  function clearError(field: 'password' | 'confirm') {
    if (errors[field]) setErrors(current => ({ ...current, [field]: undefined }));
    if (failure) setFailure(null);
  }

  async function handleSubmit() {
    const passwordError = validateNewPassword(password);
    if (passwordError) {
      setErrors({ password: passwordError });
      passwordRef.current?.focus();
      return;
    }

    const confirmError = validateConfirmPassword(password, confirm);
    if (confirmError) {
      setErrors({ confirm: confirmError });
      confirmRef.current?.focus();
      return;
    }

    setErrors({});
    setFailure(null);
    setBusy(true);
    try {
      await api.setPassword(password);
      setDone(true);
    } catch {
      setFailure(t.newPassword.failed);
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    setDone(false);
    await signOut();
    navigation.popToTop();
  }

  return (
    <AuthShell
      icon={icons.lock}
      title={t.newPassword.title}
      subtitle={t.newPassword.subtitle}
      onBack={() => navigation.goBack()}>
      <CustomTextInput
        ref={passwordRef}
        label={t.newPassword.passwordLabel}
        required
        placeholder={t.newPassword.passwordPlaceholder}
        icon={icons.lock}
        value={password}
        onChangeText={next => {
          setPassword(next);
          clearError('password');
        }}
        onBlur={() => {
          if (!password) return;
          const next = validateNewPassword(password);
          if (next) setErrors(current => ({ ...current, password: next }));
        }}
        secure
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        error={errors.password}
      />
      <CustomTextInput
        ref={confirmRef}
        label={t.newPassword.confirmLabel}
        required
        placeholder={t.newPassword.confirmPlaceholder}
        icon={icons.lock}
        value={confirm}
        onChangeText={next => {
          setConfirm(next);
          clearError('confirm');
        }}
        onBlur={() => {
          if (!confirm) return;
          const next = validateConfirmPassword(password, confirm);
          if (next) setErrors(current => ({ ...current, confirm: next }));
        }}
        secure
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={() => {
          handleSubmit();
        }}
        error={errors.confirm}
      />

      {Boolean(failure) && (
        <View style={[BaseStyle.borderRadius8, styles.failure]}>
          <Text style={[fontStyle.fontSizeSmall2x, styles.failureText]}>{failure}</Text>
        </View>
      )}

      <CustomButton
        title={t.newPassword.submit}
        onPress={() => { handleSubmit(); }}
        loading={busy}
      />

      <SuccessModal
        visible={done}
        title={modal.passwordChanged.title}
        message={modal.passwordChanged.message}
        actionLabel={modal.passwordChanged.action}
        onAction={() => { handleFinish(); }}
      />
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
