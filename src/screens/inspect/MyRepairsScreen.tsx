import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppIcon,
  Badge,
  Card,
  ConfirmModal,
  EmptyState,
  ListRow,
  icons,
} from '../../components';
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
  textFaint,
  textMuted,
  warnColor,
  warnSoft,
} from '../../constans/Color';
import { common, repairs as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import type { InspectStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<InspectStackParams, 'MyRepairs'>;

const TONE: Record<api.MyWorkOrder['status'], { color: string; background: string }> = {
  open: { color: accentColor, background: accentSoft },
  assigned: { color: warnColor, background: warnSoft },
  in_progress: { color: warnColor, background: warnSoft },
  completed: { color: okColor, background: okSoft },
  cancelled: { color: textMuted, background: dangerSoft },
};

function shortDate(iso: string | null): string {
  if (!iso) return common.dash;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * Repairs on the truck the driver is signed on to.
 *
 * Reads work orders for every truck this driver has been assigned to — that is
 * what the select policy allows and what the office means by "your truck" —
 * and filters to the current one, so a driver who moved cabs this morning is
 * not looking at last week's van.
 *
 * Live, because this screen exists to answer "has anybody picked it up yet".
 * A driver who has to pull to refresh to find that out will instead walk out
 * to the truck and guess.
 */
export function MyRepairsScreen({}: Props) {
  const { state } = useAuth();
  const driverId = state.status === 'signedIn' ? state.profile.driverId : null;
  const { vehicle } = useShift();

  const { data, loading, refreshing, error, reload, reloadQuietly } = useAsync(
    () => (driverId ? api.loadMyWorkOrders(driverId) : Promise.resolve([])),
    [driverId],
  );

  useFocusEffect(
    useCallback(() => {
      // Quiet: coming back to a tab should update the rows, not flash a
      // spinner over rows that are already correct.
      reloadQuietly();
      // reload is rebuilt every render; depending on it would loop.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [driverId]),
  );

  /*
    Subscribed here rather than in a context: this is the only screen that
    shows repairs, and a socket held open for all five tabs would be paid for
    on every screen a driver actually uses.
  */
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = api.onMyWorkOrdersChanged(() => reload());
      return unsubscribe;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [driverId]),
  );

  const [cancelling, setCancelling] = useState<api.MyWorkOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function takeBack() {
    if (!cancelling) return;
    setSaving(true);
    setFailure(null);
    try {
      await api.cancelMyWorkOrder(cancelling.id);
      setCancelling(null);
      reload();
    } catch (cause) {
      setCancelling(null);
      setFailure(cause instanceof Error ? cause.message : t.cancelFailed);
    } finally {
      setSaving(false);
    }
  }

  const orders = (data ?? []).filter(w => !vehicle || w.vehicleId === vehicle.vehicleId);
  const open = orders.filter(w => w.status !== 'completed' && w.status !== 'cancelled');
  const closed = orders.filter(w => w.status === 'completed' || w.status === 'cancelled');

  function row(order: api.MyWorkOrder, last: boolean) {
    const tone = TONE[order.status];
    /*
      Only their own, and only before the workshop picks it up. Tapping a row
      that cannot be taken back does nothing rather than opening a dialog that
      then refuses — the row says why instead.
    */
    const canTakeBack = order.mine && order.status === 'open';
    return (
      <ListRow
        key={order.id}
        icon={order.status === 'completed' ? icons.checkCircle : icons.truck}
        tone={tone.color}
        title={order.title}
        detail={
          order.completedAt
            ? t.doneOn(shortDate(order.completedAt))
            : t.raisedOn(shortDate(order.openedAt))
        }
        extra={
          order.mine
            ? canTakeBack
              ? t.mine
              : `${t.mine} · ${t.cancelOnlyOpen}`
            : undefined
        }
        trailing={<Badge label={t[order.status]} color={tone.color} background={tone.background} />}
        onPress={canTakeBack ? () => setCancelling(order) : undefined}
        last={last}
      />
    );
  }

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={accentColor} />
        }>
        <Text style={[fontStyle.fontSizeSmall2x, styles.subtitle]}>
          {vehicle ? vehicle.name : t.subtitle}
        </Text>

        {Boolean(failure) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{failure}</Text>
          </View>
        )}

        {Boolean(error) && orders.length > 0 && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{error}</Text>
          </View>
        )}

        {loading && orders.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : error ? (
          /*
            The load failed and there is nothing to show. Showing "no repairs"
            here would tell the driver their truck is clear when the truth is
            that we could not find out.
          */
          <EmptyState
            icon={icons.alert}
            title={error}
            hint={common.noNetwork}
            actionLabel={common.retry}
            onAction={reload}
          />
        ) : orders.length === 0 ? (
          <EmptyState icon={icons.truck} title={t.empty} hint={t.emptyHint} />
        ) : (
          <>
            {open.length > 0 && (
              <>
                <Text
                  style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
                  {t.open.toUpperCase()}
                </Text>
                <Card padded={false}>{open.map((w, i) => row(w, i === open.length - 1))}</Card>
              </>
            )}

            {closed.length > 0 && (
              <>
                <Text
                  style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
                  {t.completed.toUpperCase()}
                </Text>
                <Card padded={false}>{closed.map((w, i) => row(w, i === closed.length - 1))}</Card>
              </>
            )}
          </>
        )}
      </ScrollView>

      <ConfirmModal
        visible={cancelling !== null}
        title={t.cancelConfirm}
        message={t.cancelHint}
        confirmLabel={t.cancel}
        icon={icons.close}
        tone="danger"
        loading={saving}
        onConfirm={() => {
          takeBack().catch(() => {});
        }}
        onCancel={() => setCancelling(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.ExtraLarge },
  subtitle: { color: textMuted, paddingTop: spacings.large, lineHeight: hp(2.4) },
  section: {
    color: textFaint,
    letterSpacing: 1.1,
    marginTop: spacings.xxLarge,
    marginBottom: spacings.large,
  },
  loading: { paddingVertical: hp(8), alignItems: 'center' },
  error: {
    backgroundColor: dangerSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
});
