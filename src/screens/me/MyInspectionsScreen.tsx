import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppIcon, Badge, Card, EmptyState, ListRow, icons } from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  accentSoft,
  appBg,
  dangerColor,
  dangerSoft,
  okColor,
  okSoft,
  textMuted,
} from '../../constans/Color';
import { common, myInspections as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';

type Submission = Awaited<ReturnType<typeof api.loadMyInspections>>[number];

const TONE: Record<string, { color: string; background: string }> = {
  submitted: { color: accentColor, background: accentSoft },
  reviewed: { color: okColor, background: okSoft },
  flagged: { color: dangerColor, background: dangerSoft },
};

function when(iso: string | null): string {
  if (!iso) return common.dash;
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Inspections this driver has filed.
 *
 * The status is the OFFICE's, not the driver's: a submission goes up as
 * "submitted" and only the console moves it to reviewed or flagged. That is
 * the whole reason this screen is worth having — a driver can see that
 * somebody actually looked at what they sent.
 */
export function MyInspectionsScreen() {
  const { state } = useAuth();
  const driverId = state.status === 'signedIn' ? state.profile.driverId : null;

  const { data, loading, refreshing, error, reload, reloadQuietly } = useAsync(
    () => (driverId ? api.loadMyInspections(driverId) : Promise.resolve([])),
    [driverId],
  );

  /* Reloaded on focus: a driver comes straight here from filing one. */
  useFocusEffect(
    useCallback(() => {
      // Quiet: coming back to a tab should update the rows, not flash a
      // spinner over rows that are already correct.
      reloadQuietly();
    }, [reloadQuietly]),
  );

  /*
    Live, because the office reviewing or flagging a submission is
    the whole reason this screen is worth opening. Subscribed here rather than
    in a context: these are the only two screens that show it, and a socket
    held open for all five tabs would be paid for on every screen a driver
    actually uses.
  */
  useFocusEffect(
    useCallback(() => api.onMyReportsChanged(reloadQuietly), [reloadQuietly]),
  );

  const rows = (data ?? []) as Submission[];

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={accentColor} />
        }>
        <Text style={[fontStyle.fontSizeSmall2x, styles.subtitle]}>{t.subtitle}</Text>

        {Boolean(error) && rows.length > 0 && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{error}</Text>
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
            <EmptyState icon={icons.inspect} title={t.empty} hint={t.emptyHint} />
          </View>
        ) : (
          <Card padded={false} style={styles.card}>
            {rows.map((row, i) => {
              const tone = TONE[row.status] ?? TONE.submitted;
              return (
                <ListRow
                  key={row.id}
                  icon={icons.inspect}
                  tone={tone.color}
                  title={row.formName || t.subtitle}
                  detail={when(row.submittedAt)}
                  trailing={
                    <Badge
                      label={t.status[row.status as keyof typeof t.status] ?? row.status}
                      color={tone.color}
                      background={tone.background}
                    />
                  }
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
