import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CustomButton,
  CustomTextInput,
  AppIcon,
  icons,
  type CustomTextInputRef,
} from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  accentSoft,
  appBg,
  cardBg,
  dangerColor,
  dangerSoft,
  shadowColor,
  textBody,
  textDark,
} from '../../constans/Color';
import { APP_NAME, auth as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import { validateEmail, validatePassword } from '../../validation';
import { useAuth } from '../../context/AuthContext';
import type { AuthStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParams, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailRef = useRef<CustomTextInputRef>(null);
  const passwordRef = useRef<CustomTextInputRef>(null);

  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!failure) return;
    Animated.timing(shake, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [failure, shake]);

  function clearError(field: 'email' | 'password') {
    if (errors[field]) setErrors(current => ({ ...current, [field]: undefined }));
    if (failure) setFailure(null);
  }

  async function handleSubmit() {
    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      emailRef.current?.focus();
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrors({ password: passwordError });
      passwordRef.current?.focus();
      return;
    }

    setErrors({});
    setFailure(null);
    shake.setValue(0);
    setBusy(true);
    try {
      await signIn(email, password);
    } catch {
      setFailure(t.signIn.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={BaseStyle.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={BaseStyle.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={BaseStyle.flex}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={[BaseStyle.alignItemsCenter, styles.brandBlock]}>
              <View style={[BaseStyle.alignJustifyCenter, styles.logo]}>
                <AppIcon name={icons.truck} size={22} color={accentColor} />
              </View>
              <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.brand]}>
                {APP_NAME.toUpperCase()}
              </Text>
            </View>

            <View style={styles.card}>
              <Text
                style={[
                  fontStyle.fontSizeLarge2x,
                  fontStyle.fontWeightMedium1x,
                  styles.title,
                ]}>
                {t.signIn.title}
              </Text>
              <Text style={[fontStyle.fontSizeNormal1x, styles.subtitle]}>
                {t.signIn.subtitle}
              </Text>

              <CustomTextInput
                ref={emailRef}
                label={t.signIn.emailLabel}
                required
                placeholder={t.signIn.emailPlaceholder}
                icon={icons.mail}
                value={email}
                onChangeText={next => {
                  setEmail(next);
                  clearError('email');
                }}
                onBlur={() => {
                  if (!email.trim()) return;
                  const next = validateEmail(email);
                  if (next) setErrors(current => ({ ...current, email: next }));
                }}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                error={errors.email}
              />

              <CustomTextInput
                ref={passwordRef}
                label={t.signIn.passwordLabel}
                required
                placeholder={t.signIn.passwordPlaceholder}
                icon={icons.lock}
                value={password}
                onChangeText={next => {
                  setPassword(next);
                  clearError('password');
                }}
                onBlur={() => {
                  if (!password) return;
                  const next = validatePassword(password);
                  if (next) setErrors(current => ({ ...current, password: next }));
                }}
                secure
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={() => {
                  handleSubmit();
                }}
                error={errors.password}
              />

              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => navigation.navigate('ForgotPassword')}
                style={[BaseStyle.alignSelfEnd, styles.forgot]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text
                  style={[
                    fontStyle.fontSizeSmall2x,
                    fontStyle.fontWeightMedium,
                    styles.forgotText,
                  ]}>
                  {t.signIn.forgot}
                </Text>
              </Pressable>

              {Boolean(failure) && (
                <Animated.View
                  style={[
                    BaseStyle.flexDirectionRow,
                    BaseStyle.alignItemsCenter,
                    BaseStyle.borderRadius8,
                    styles.failure,
                    {
                      opacity: shake,
                      transform: [
                        {
                          translateY: shake.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-6, 0],
                          }),
                        },
                      ],
                    },
                  ]}>
                  <AppIcon name={icons.alert} size={16} color={dangerColor} />
                  <Text style={[fontStyle.fontSizeSmall2x, styles.failureText]}>{failure}</Text>
                </Animated.View>
              )}

              <CustomButton
                title={t.signIn.submit}
                onPress={() => {
                  handleSubmit();
                }}
                loading={busy}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacings.xxLarge,
    paddingVertical: spacings.xxxLarge,
  },
  brandBlock: { marginBottom: spacings.xxLarge },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: accentSoft,
    marginBottom: spacings.large,
  },
  brand: { color: accentColor, letterSpacing: 1.4 },
  card: {
    backgroundColor: cardBg,
    borderRadius: 20,
    paddingHorizontal: spacings.xxLarge,
    paddingTop: spacings.xxxLarge,
    paddingBottom: spacings.xxLarge,
    shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  title: { color: textDark, marginBottom: spacings.normal },
  subtitle: { color: textBody, lineHeight: hp(2.6), marginBottom: spacings.xxLarge },
  forgot: { marginTop: -spacings.normal, marginBottom: spacings.xxLarge },
  forgotText: { color: accentColor },
  failure: {
    backgroundColor: dangerSoft,
    paddingVertical: spacings.normalx,
    paddingHorizontal: spacings.large,
    marginBottom: spacings.large,
  },
  failureText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
});
