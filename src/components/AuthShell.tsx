import React from 'react';
import {
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
import { AppIcon, icons } from './AppIcon';
import { BaseStyle } from '../constans/Style';
import { spacings, style as fontStyle } from '../constans/Fonts';
import {
  accentColor,
  accentSoft,
  appBg,
  cardBg,
  shadowColor,
  textBody,
  textDark,
} from '../constans/Color';
import { heightPercentageToDP as hp } from '../utils';

/**
 * Shared chrome for forgot-password, OTP and reset.
 *
 * Same centred card as login, with a back chevron when the screen was pushed
 * on top of another. The icon in the mark is the only thing that changes.
 */
export function AuthShell({
  icon,
  title,
  subtitle,
  children,
  onBack,
}: {
  icon: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={BaseStyle.flex} edges={['top', 'bottom']}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.back}>
            <AppIcon name={icons.back} size={22} color={textDark} />
          </Pressable>
        ) : null}

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
                <AppIcon name={icon} size={22} color={accentColor} />
              </View>
            </View>

            <View style={styles.card}>
              <Text
                style={[
                  fontStyle.fontSizeLarge2x,
                  fontStyle.fontWeightMedium1x,
                  styles.title,
                ]}>
                {title}
              </Text>
              <Text style={[fontStyle.fontSizeNormal1x, styles.subtitle]}>{subtitle}</Text>
              {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  back: {
    position: 'absolute',
    top: spacings.normal,
    left: spacings.xxLarge,
    zIndex: 2,
    paddingVertical: spacings.normal,
  },
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
  },
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
});
