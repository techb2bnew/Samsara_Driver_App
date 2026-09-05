import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon, Badge, Card, EmptyState, ListRow, icons } from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  accentLine,
  accentSoft,
  appBg,
  cardBg,
  dangerColor,
  dangerSoft,
  okColor,
  okSoft,
  textFaint,
  textMuted,
  warnColor,
  warnSoft,
} from '../../constans/Color';
import { common, myDocuments as t, paperwork } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import type { MeStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MeStackParams, 'MyDocuments'>;

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Whole days from today. Negative once the date has passed. */
function daysUntil(iso: string): number {
  const then = new Date(`${iso}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((then.getTime() - now.getTime()) / 86_400_000);
}

/**
 * The driver's paperwork.
 *
 * Read only, and that is the point rather than a shortcut: the storage policy
 * lets a driver READ files filed under their own id but not write them. A
 * driver who could replace their own medical certificate is the entire reason
 * that certificate is on file.
 *
 * Expiry leads, because it is the only thing on this screen anybody acts on.
 */
export function MyDocumentsScreen({ navigation }: Props) {
  const { state } = useAuth();
  const driverId = state.status === 'signedIn' ? state.profile.driverId : null;
  const [opening, setOpening] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const { data, loading, refreshing, error, reload, reloadQuietly } = useAsync(
    () => (driverId ? api.loadMyDocuments(driverId) : Promise.resolve([])),
    [driverId],
  );

  useFocusEffect(
    useCallback(() => {
      // Quiet: coming back to a tab should update the rows, not flash a
      // spinner over rows that are already correct.
      reloadQuietly();
    }, [reloadQuietly]),
  );

  const rows = data ?? [];

  /*
   * The bucket is private, so there is nothing to link to up front. A URL is
   * signed on the tap and opened in the phone's own viewer; one signed on
   * render would be spent on every scroll and stale by the time it was used.
   */
  async function open(storagePath: string | null, id: string) {
    setOpening(id);
    setFailure(null);
    try {
      const url = await api.documentUrl(storagePath);
      if (url) await Linking.openURL(url);
    } catch {
      setFailure(t.openFailed);
    } finally {
      setOpening(null);
    }
  }

  function expiryFor(expiresOn: string | null) {
    if (!expiresOn) return { label: t.noExpiry, color: textFaint, background: okSoft, show: false };
    const days = daysUntil(expiresOn);
    if (days < 0) return { label: t.expired, color: dangerColor, background: dangerSoft, show: true };
    if (days <= 30)
      return {
        label: t.expiringSoon(days),
        color: warnColor,
        background: warnSoft,
        show: true,
      };
    return { label: t.expires(shortDate(expiresOn)), color: okColor, background: okSoft, show: true };
  }

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={accentColor} />
        }>
        <Text style={[fontStyle.fontSizeSmall2x, styles.subtitle]}>{t.subtitle}</Text>

        {/*
          A dashed tile, full width, reading as an empty slot in the list.

          Two shapes were wrong before it. The full-width CustomButton is the
          one at the foot of a form — it fills the screen because pressing it
          ENDS what you came to do, and this starts something. A small filled
          pill fixed that but left a bright orange lozenge floating under grey
          text with half the row empty beside it.

          Dashed and unfilled sits at the same weight as the cards below it
          without competing with them, and the shape itself says "there is room
          for another one here".
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paperwork.title}
          onPress={() => navigation.navigate('AddPaperwork')}
          style={({ pressed }) => [
            BaseStyle.flexDirectionRow,
            BaseStyle.alignJustifyCenter,
            styles.add,
            pressed && styles.addPressed,
          ]}>
          <View style={[BaseStyle.alignJustifyCenter, styles.addIcon]}>
            <AppIcon name={icons.camera} size={17} color={accentColor} />
          </View>
          <Text
            style={[fontStyle.fontSizeNormal1x, fontStyle.fontWeightMedium, styles.addLabel]}>
            {paperwork.title}
          </Text>
        </Pressable>

        {Boolean(failure || (error && rows.length > 0)) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{failure ?? error}</Text>
          </View>
        )}

        {loading && rows.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : error ? (
          /*
            The load failed and there is nothing to show. This used to render
            "nothing here" underneath an error banner — telling the driver both
            that something went wrong and that there is nothing, when the truth
            is that we do not know. Retry belongs here and only here.
          */
          <View style={styles.empty}>
            <EmptyState
              icon={icons.alert}
              title={error}
              hint={common.noNetwork}
              actionLabel={common.retry}
              onAction={reload}
            />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <EmptyState icon={icons.shield} title={t.empty} hint={t.emptyHint} />
          </View>
        ) : (
          <Card padded={false} style={styles.card}>
            {rows.map((row, i) => {
              const expiry = expiryFor(row.expires_on);
              return (
                <ListRow
                  key={row.id}
                  icon={opening === row.id ? icons.refresh : icons.shield}
                  tone={expiry.show ? expiry.color : accentColor}
                  title={row.title ?? row.doc_type ?? common.dash}
                  detail={
                    t.category[row.category as keyof typeof t.category] ?? row.doc_type ?? ''
                  }
                  trailing={
                    expiry.show ? (
                      <Badge
                        label={expiry.label}
                        color={expiry.color}
                        background={expiry.background}
                      />
                    ) : undefined
                  }
                  onPress={() => {
                    open(row.storage_path, row.id).catch(() => {});
                  }}
                  last={i === rows.length - 1}
                />
              );
            })}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.ExtraLarge },
  subtitle: { color: textMuted, paddingTop: spacings.large, lineHeight: hp(2.4) },
  add: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: accentLine,
    backgroundColor: accentSoft,
    paddingVertical: spacings.xLarge,
    marginTop: spacings.large,
  },
  addPressed: { opacity: 0.7 },
  addIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: cardBg,
    marginRight: spacings.normalx,
  },
  addLabel: { color: accentColor },
  card: { marginTop: spacings.large },
  empty: { marginTop: spacings.xxLarge },
  loading: { paddingVertical: hp(8), alignItems: 'center' },
  error: {
    backgroundColor: dangerSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
});
