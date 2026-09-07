import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon, Card, CustomButton, CustomTextInput, icons } from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  appBg,
  cardBgSoft,
  dangerColor,
  dangerSoft,
  onAccent,
  textDark,
  textFaint,
  textMuted,
} from '../../constans/Color';
import { paperwork as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { choosePhoto, photosAvailable, takePhoto, type Picture } from '../../helpers/photo';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import type { MeStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MeStackParams, 'AddPaperwork'>;

const TYPES = api.TRIP_DOC_TYPES;

/**
 * Photographing paperwork from the cab.
 *
 * Trip paperwork only, and the screen says so rather than leaving a driver
 * hunting for "licence" in the list. A driver reads their own compliance
 * documents and never writes them — the storage policy refuses it, and the
 * reason is that a driver who could replace their own medical certificate is
 * the entire point of that certificate being on file.
 *
 * Reached from two places, because paperwork happens in two: Me → My
 * documents, and the stop where a delivery note is actually signed. The stop
 * passes its own id so the office gets the note filed against the right job.
 */
export function AddPaperworkScreen({ route, navigation }: Props) {
  const { state } = useAuth();
  const profile = state.status === 'signedIn' ? state.profile : null;
  const { vehicle } = useShift();

  const [picture, setPicture] = useState<Picture | null>(null);
  const [docType, setDocType] = useState<api.TripDocType>(
    /* A stop is where a delivery note comes from, so start there. */
    route.params?.stopName ? 'proof_of_delivery' : 'receipt',
  );
  const [label, setLabel] = useState(route.params?.stopName ?? '');
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const available = photosAvailable();

  async function pick(from: 'camera' | 'library') {
    setFailure(null);
    const result = from === 'camera' ? await takePhoto() : await choosePhoto();

    // Backing out is not a failure and nothing should be said about it.
    if (!result.ok && result.cancelled) return;
    if (!result.ok) {
      setFailure(result.reason === 'not-available' ? t.unavailable : t.failed);
      return;
    }
    setPicture(result.picture);
  }

  async function send() {
    if (!profile) return;
    if (!picture) {
      setFailure(t.needPhoto);
      return;
    }

    setSending(true);
    setFailure(null);
    try {
      await api.uploadTripDocument(profile.orgId, profile.driverId, {
        docType,
        title: label,
        base64: picture.base64,
        fileName: picture.fileName,
        mimeType: picture.mimeType,
        /*
         * The truck, when they are signed on to one. Not required — paperwork
         * handed over at a depot with no truck picked is still paperwork, and
         * refusing it would mean the office never gets it.
         */
        vehicleId: vehicle?.vehicleId ?? null,
        stopId: route.params?.stopId ?? null,
      });
      navigation.goBack();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : t.sendFailed);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Text style={[fontStyle.fontSizeSmall2x, styles.subtitle]}>{t.subtitle}</Text>
        <Text style={[fontStyle.fontSizeSmall1x, styles.note]}>{t.tripOnly}</Text>

        <Card style={styles.card}>
          {picture ? (
            <>
              <Image source={{ uri: picture.uri }} style={styles.preview} resizeMode="cover" />
              <CustomButton
                title={t.retake}
                icon={icons.camera}
                variant="outline"
                style={styles.retake}
                onPress={() => {
                  pick('camera').catch(() => {});
                }}
              />
            </>
          ) : (
            <>
              <View style={[BaseStyle.alignJustifyCenter, styles.placeholder]}>
                <AppIcon name={icons.camera} size={26} color={accentColor} />
              </View>
              <CustomButton
                title={t.take}
                icon={icons.camera}
                disabled={!available}
                onPress={() => {
                  pick('camera').catch(() => {});
                }}
              />
              <CustomButton
                title={t.choose}
                icon={icons.download}
                variant="outline"
                disabled={!available}
                style={styles.second}
                onPress={() => {
                  pick('library').catch(() => {});
                }}
              />
            </>
          )}
        </Card>

        <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
          {t.kind.toUpperCase()}
        </Text>
        <View style={[BaseStyle.flexDirectionRow, BaseStyle.flexWrap]}>
          {TYPES.map(type => {
            const on = docType === type;
            return (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setDocType(type)}
                style={[BaseStyle.alignJustifyCenter, styles.chip, on && styles.chipOn]}>
                <Text
                  style={[
                    fontStyle.fontSizeSmall1x,
                    fontStyle.fontWeightMedium,
                    { color: on ? onAccent : textMuted },
                  ]}>
                  {t.types[type]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={styles.card}>
          <CustomTextInput
            label={t.label}
            value={label}
            onChangeText={setLabel}
            placeholder={t.labelPlaceholder}
            autoCapitalize="sentences"
            multiline
          />
          <Text style={[fontStyle.fontSizeSmall1x, styles.hint]}>{t.labelHint}</Text>
        </Card>

        {Boolean(failure) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{failure}</Text>
          </View>
        )}

        <CustomButton
          title={t.send}
          icon={icons.send}
          loading={sending}
          disabled={!picture}
          style={styles.submit}
          onPress={() => {
            send().catch(() => {});
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.ExtraLarge },

  subtitle: { color: textDark, paddingTop: spacings.large, lineHeight: hp(2.5) },
  note: { color: textMuted, marginTop: spacings.small, lineHeight: hp(2.2) },
  card: { marginTop: spacings.large },

  placeholder: {
    height: hp(16),
    borderRadius: 16,
    backgroundColor: cardBgSoft,
    marginBottom: spacings.large,
  },
  preview: {
    width: '100%',
    height: hp(28),
    borderRadius: 16,
  },
  retake: { marginTop: spacings.large },
  second: { marginTop: spacings.normalx },

  section: {
    color: textFaint,
    letterSpacing: 1.1,
    marginTop: spacings.xxLarge,
    marginBottom: spacings.large,
  },
  chip: {
    backgroundColor: cardBgSoft,
    borderRadius: 12,
    paddingVertical: spacings.normal,
    paddingHorizontal: spacings.large,
    marginRight: spacings.normal,
    marginBottom: spacings.normal,
  },
  chipOn: { backgroundColor: accentColor },

  hint: { color: textMuted, marginTop: spacings.normal, lineHeight: hp(2.2) },
  error: {
    backgroundColor: dangerSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
  submit: { marginTop: spacings.xxLarge },
});
