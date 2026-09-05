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
  warnColor,
  warnSoft,
} from '../../constans/Color';
import { common, myFaults as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';

const TONE: Record<string, { color: string; background: string }> = {
  open: { color: dangerColor, background: dangerSoft },
  in_repair: { color: warnColor, background: warnSoft },
  resolved: { color: okColor, background: okSoft },
  dismissed: { color: accentColor, background: accentSoft },
};

function when(iso: string | null): string {
  if (!iso) return common.dash;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * Faults this driver has reported, and what became of them.
 *
 * "Fixed" and "closed without work" are both endings and both worth showing.
 * A driver who reports soft brakes and hears nothing stops reporting; one who
 * sees the office decided it was nothing at least knows it was read.
 */
export function MyFaultsScreen() {
  const { state } = useAuth();
  const driverId = state.status === 'signedIn' ? state.profile.driverId : null;

  const { data, loading, refreshing, error, reload, reloadQuietly } = useAsync(
    () => (driverId ? api.loadMyDefects(driverId) : Promise.resolve([])),
    [driverId],
  );

  useFocusEffect(
    useCallback(() => {
      // Quiet: coming back to a tab should update the rows, not flash a
      // spinner over rows that are already correct.
      reloadQuietly();
    }, [reloadQuietly]),
  );

  /*
    Live, because the office resolving or dismissing a fault is
    the whole reason this screen is worth opening. Subscribed here rather than
    in a context: these are the only two screens that show it, and a socket
    held open for all five tabs would be paid for on every screen a driver
    actually uses.
  */
  useFocusEffect(
    useCallback(() => api.onMyReportsChanged(reloadQuietly), [reloadQuietly]),
  );

  const rows = data ?? [];

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
            <EmptyState icon={icons.warning} title={t.empty} hint={t.emptyHint} />
          </View>
        ) : (
          <Card padded={false} style={styles.card}>
            {rows.map((row, i) => {
              const tone = TONE[row.status] ?? TONE.open;
              return (
                <ListRow
                  key={row.id}
                  icon={icons.warning}
                  tone={tone.color}
                  title={row.area}
                  detail={row.finding}
                  /* The repair job, when the office raised one off this fault.
                     It is the answer to "did anything happen". */
                  extra={
                    row.work_order_id
                      ? `${when(row.created_at)} · ${t.hasWorkOrder}`
                      : `${when(row.created_at)} · ${
                          t.severity[row.severity as keyof typeof t.severity] ?? row.severity
                        }`
                  }
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
