import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppIcon,
  CustomButton,
  DayPicker,
  DutyGraph,
  HosRecap,
  StatTile,
  ConfirmModal,
  icons,
} from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  accentSoft,
  appBg,
  borderColor,
  cardBg,
  dutyDrivingColor,
  dutyOffColor,
  dutyOnDutyColor,
  dutySleeperColor,
  okColor,
  okSoft,
  onAccent,
  shadowColor,
  textDark,
  textFaint,
  textMuted,
} from '../../constans/Color';
import { common, duty as t, screenTitles, vehiclePicker } from '../../constans/Constants';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';
import { useShift } from '../../context/ShiftContext';
import {
  currentStatus,
  drivingMinutes,
  formatClock,
  formatTime,
  isoDate,
  longestBreakMinutes,
  onDutyMinutes,
  segmentsForDay,
} from '../../helpers/duty';
import { cycleDaysFor, recapFor, regulatorFrom } from '../../helpers/hosLimits';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import type { DutyStatus } from '../../supabase/api';
import type { DutyStackParams, TabParams } from '../../navigation/types';

type Props = CompositeScreenProps<
  NativeStackScreenProps<DutyStackParams, 'DutyHome'>,
  BottomTabScreenProps<TabParams>
>;

/**
 * The four statuses, in the order a shift actually runs.
 *
 * Off → Sleeper → Driving → On duty matches the paper log book's row order, so
 * the buttons sit under the graph rows they correspond to.
 */
const CHOICES: Array<{ status: DutyStatus; label: string; color: string; icon: string }> = [
  { status: 'off_duty', label: t.status.off, color: dutyOffColor, icon: 'power-outline' },
  { status: 'sleeper_berth', label: t.status.sleeper, color: dutySleeperColor, icon: 'moon-outline' },
  { status: 'driving', label: t.status.driving, color: dutyDrivingColor, icon: 'car-outline' },
  { status: 'on_duty_not_driving', label: t.status.on_duty, color: dutyOnDutyColor, icon: 'construct-outline' },
];

/**
 * The home of the app.
 *
 * A driver opens this to change status and to see whether their day adds up.
 * Everything else is one tap away; this screen is the one they use twenty times
 * a shift, so it holds no scrolling-required content above the buttons.
 *
 * The status buttons are deliberately large and colour-coded to the graph
 * rows. Changing status is the single most consequential thing a driver does in
 * the app — it is their legal record — and a mis-tap is a false log.
 */
export function DutyHomeScreen({ navigation }: Props) {
  const { state } = useAuth();
  const profile = state.status === 'signedIn' ? state.profile : null;
  const {
    loading,
    error,
    vehicle,
    events,
    certifiedDates,
    earliestDate,
    refresh,
    changeStatus,
    certifyDay,
  } = useShift();

  const { unreadCount } = useNotifications();
  const [busy, setBusy] = useState<DutyStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

  /*
   * Which day is on screen. Today by default, and never later than today —
   * see DayPicker. A driver reviews yesterday's log before certifying it, or
   * the day a roadside inspector asked about.
   */
  const [viewDate, setViewDate] = useState(today);
  const viewKey = isoDate(viewDate);
  const isToday = viewKey === isoDate(today);

  const segments = useMemo(
    () => segmentsForDay(events, viewDate, today),
    [events, viewDate, today],
  );
  const certified = certifiedDates.has(viewKey);

  /*
   * The cycle total needs every day in the window, not just today. Built here
   * from the same events the graph draws, so the strip and the grid can never
   * disagree about what a day contained.
   */
  /*
   * The remaining-hours strip is only meaningful for today: "10:50 driving
   * left" is a statement about right now, and showing it on a past day would
   * be telling a driver how much they can still drive on a day that is over.
   */
  const recap = useMemo(() => {
    if (!isToday) return null;

    const book = regulatorFrom(profile?.regulator ?? null);
    if (!book) return recapFor(null, segments, []);

    const days: ReturnType<typeof segmentsForDay>[] = [];
    for (let back = cycleDaysFor(book) - 1; back >= 0; back--) {
      const day = new Date(today);
      day.setDate(today.getDate() - back);
      days.push(segmentsForDay(events, day, today));
    }
    return recapFor(book, segments, days);
  }, [isToday, profile?.regulator, events, segments, today]);
  const now = currentStatus(events);
  const activeStatus = now?.status ?? null;

  async function pick(status: DutyStatus) {
    if (status === activeStatus) return;

    // Hours attach to a vehicle. Going on duty with none would record a shift
    // against nothing, and report_position would have no truck to move.
    if (!vehicle && status !== 'off_duty') {
      setFailure(t.noVehicle);
      return;
    }

    setBusy(status);
    setFailure(null);
    try {
      await changeStatus(status);
    } catch {
      setFailure(t.changeFailed);
    } finally {
      setBusy(null);
    }
  }

  async function handleCertify() {
    setCertifying(true);
    try {
      await certifyDay(viewKey);
      setConfirming(false);
    } catch {
      setFailure(common.somethingWrong);
    } finally {
      setCertifying(false);
    }
  }

  return (
    <SafeAreaView style={[BaseStyle.flex, styles.ground]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={accentColor} />
        }>
        {/*
          The bell sits here, not only in Me. This is the screen a driver has
          open all shift; a notification list they have to go looking for in
          another tab is one they will not see.
        */}
        <View
          style={[
            BaseStyle.flexDirectionRow,
            BaseStyle.alignItemsCenter,
            BaseStyle.justifyContentSpaceBetween,
            styles.topBar,
          ]}>
          <Text style={[fontStyle.fontSizeLargeX, fontStyle.fontWeightMedium1x, styles.greeting]}>
            {profile ? profile.firstName : ''}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={screenTitles.notifications}
            onPress={() => navigation.navigate('Notifications')}
            style={({ pressed }) => [
              BaseStyle.alignJustifyCenter,
              styles.bell,
              pressed && styles.pressed,
            ]}>
            <AppIcon name={unreadCount > 0 ? icons.bellActive : icons.bell} size={20} color={textDark} />
            {unreadCount > 0 && (
              <View style={[BaseStyle.alignJustifyCenter, styles.bellBadge]}>
                <Text
                  style={[
                    fontStyle.fontSizeExtraExtraSmall,
                    fontStyle.fontWeightMedium1x,
                    styles.bellBadgeText,
                  ]}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ------------------------------------------------------- the truck */}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('VehiclePicker')}
          style={({ pressed }) => [
            BaseStyle.flexDirectionRow,
            BaseStyle.alignItemsCenter,
            BaseStyle.borderRadius10,
            styles.truckCard,
            pressed && styles.pressed,
          ]}>
          <View style={[BaseStyle.alignJustifyCenter, styles.truckBadge]}>
            <AppIcon name={icons.truck} size={20} color={accentColor} />
          </View>
          <View style={BaseStyle.flex}>
            <Text style={[fontStyle.fontSizeExtraSmall, styles.truckLabel]}>
              {vehicle ? vehiclePicker.current.toUpperCase() : ''}
            </Text>
            <Text
              style={[fontStyle.fontSizeNormal2x, fontStyle.fontWeightMedium, styles.truckName]}>
              {vehicle ? vehicle.name : t.noVehicle}
            </Text>
            {Boolean(vehicle) && (
              <Text style={[fontStyle.fontSizeSmall1x, styles.truckPlate]}>{vehicle!.plate}</Text>
            )}
          </View>
          <AppIcon name={icons.forward} size={20} color={textFaint} />
        </Pressable>

        {/* ------------------------------------------------- current status */}
        <View style={[BaseStyle.alignItemsCenter, styles.nowBlock]}>
          <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.nowLabel]}>
            {t.title.toUpperCase()}
          </Text>
          <Text style={[fontStyle.fontSizeLarge2x, fontStyle.fontWeightMedium1x, styles.nowValue]}>
            {activeStatus
              ? CHOICES.find(c => c.status === activeStatus)?.label ?? t.status.off
              : t.status.off}
          </Text>
          {Boolean(now) && (
            <Text style={[fontStyle.fontSizeSmall2x, styles.nowSince]}>
              {t.since(formatTime(now!.startedAt))}
            </Text>
          )}
        </View>

        {/*
          Only on today. A status change records the time it is tapped, so
          offering these while a past day is on screen would look like editing
          that day and would actually write to this one. Correcting a past log
          is a request to the office — see RequestCorrection.
        */}
        {!isToday && (
          <Text style={[fontStyle.fontSizeSmall2x, styles.pastNote]}>{t.pastDayNote}</Text>
        )}

        <View
          style={[
            BaseStyle.flexDirectionRow,
            BaseStyle.flexWrap,
            styles.grid,
            !isToday && styles.hidden,
          ]}>
          {CHOICES.map(choice => {
            const active = choice.status === activeStatus;
            return (
              <Pressable
                key={choice.status}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                disabled={busy !== null}
                onPress={() => pick(choice.status)}
                style={({ pressed }) => [
                  BaseStyle.alignJustifyCenter,
                  BaseStyle.borderRadius10,
                  styles.choice,
                  active && { backgroundColor: choice.color, borderColor: choice.color },
                  pressed && styles.pressed,
                ]}>
                <AppIcon
                  name={choice.icon}
                  size={26}
                  color={active ? onAccent : choice.color}
                />
                <Text
                  style={[
                    fontStyle.fontSizeSmall2x,
                    fontStyle.fontWeightMedium,
                    styles.choiceLabel,
                    { color: active ? onAccent : textDark },
                  ]}>
                  {choice.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {Boolean(failure || error) && (
          <View
            style={[
              BaseStyle.flexDirectionRow,
              BaseStyle.alignItemsCenter,
              BaseStyle.borderRadius8,
              styles.failure,
            ]}>
            <AppIcon name={icons.alert} size={17} color={accentColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.failureText]}>
              {failure ?? error}
            </Text>
          </View>
        )}

        {/* ------------------------------------------------------ the day */}
        <View style={styles.picker}>
          <DayPicker date={viewDate} earliest={earliestDate} onChange={setViewDate} />
        </View>

        {viewKey === earliestDate && (
          <Text style={[fontStyle.fontSizeExtraSmall, styles.oldest]}>{t.oldestLoaded}</Text>
        )}

        <View style={[BaseStyle.borderRadius10, styles.card]}>
          <DutyGraph segments={segments} />
        </View>

        {/* Under the grid, the way an ELD stacks them: the record above, the
            decision below. Only for today — see the recap memo. */}
        {recap && (
          <View style={styles.recap}>
            <HosRecap recap={recap} />
          </View>
        )}

        <View style={[BaseStyle.flexDirectionRow, styles.tiles]}>
          <StatTile
            label={t.drivingToday}
            value={formatClock(drivingMinutes(segments))}
            icon="car-outline"
            tone={dutyDrivingColor}
          />
          <StatTile
            label={t.onDutyToday}
            value={formatClock(onDutyMinutes(segments))}
            icon="briefcase-outline"
          />
          <StatTile
            label={t.longestBreak}
            value={formatClock(longestBreakMinutes(segments))}
            icon="cafe-outline"
          />
        </View>

        {/* ---------------------------------------------------- certify */}
        {certified ? (
          <View
            style={[
              BaseStyle.flexDirectionRow,
              BaseStyle.alignItemsCenter,
              BaseStyle.borderRadius10,
              styles.certified,
            ]}>
            <AppIcon name={icons.checkCircle} size={20} color={okColor} />
            <Text style={[fontStyle.fontSizeNormal1x, fontStyle.fontWeightMedium, styles.certifiedText]}>
              {t.certifiedOn}
            </Text>
          </View>
        ) : (
          <>
            <Text style={[fontStyle.fontSizeSmall2x, styles.certifyHint]}>{t.certifyHint}</Text>
            <CustomButton
              title={isToday ? t.certify : t.certifyDay}
              icon={icons.check}
              disabled={segments.length === 0}
              onPress={() => setConfirming(true)}
            />
          </>
        )}
      </ScrollView>

      <ConfirmModal
        visible={confirming}
        title={isToday ? t.certify : t.certifyDay}
        message={t.certifyHint}
        confirmLabel={isToday ? t.certify : t.certifyDay}
        icon={icons.shield}
        loading={certifying}
        onConfirm={handleCertify}
        onCancel={() => setConfirming(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.ExtraLarge },
  pressed: { opacity: 0.75 },

  topBar: { paddingTop: spacings.large },
  greeting: { color: textDark },
  bell: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: cardBg,
    borderWidth: 1,
    borderColor,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: wp(4.6),
    height: wp(4.6),
    borderRadius: wp(2.3),
    backgroundColor: accentColor,
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: appBg,
  },
  bellBadgeText: { color: onAccent },

  truckCard: {
    backgroundColor: cardBg,
    borderWidth: 1,
    borderColor,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  truckBadge: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: accentSoft,
    marginRight: spacings.large,
  },
  truckLabel: { color: textFaint },
  truckName: { color: textDark },
  truckPlate: { color: textMuted, marginTop: spacings.xxsmall },

  nowBlock: { paddingVertical: spacings.xxxLarge },
  nowLabel: { color: textFaint, letterSpacing: 1.3 },
  nowValue: { color: textDark, marginTop: spacings.normal },
  nowSince: { color: textMuted, marginTop: spacings.normal },

  grid: { justifyContent: 'space-between' },
  choice: {
    width: '48%',
    minHeight: hp(12),
    backgroundColor: cardBg,
    borderWidth: 1.5,
    borderColor,
    marginBottom: spacings.large,
  },
  choiceLabel: { marginTop: spacings.normalx },

  failure: {
    backgroundColor: accentSoft,
    paddingVertical: spacings.large,
    paddingHorizontal: spacings.large,
    marginBottom: spacings.large,
  },
  failureText: { color: accentColor, marginLeft: spacings.normalx, flex: 1 },

  section: { color: textDark, marginTop: spacings.large, marginBottom: spacings.large },
  card: {
    backgroundColor: cardBg,
    borderWidth: 1,
    borderColor,
    padding: spacings.large,
    shadowColor,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  picker: { marginTop: spacings.large, marginBottom: spacings.large },
  oldest: { color: textMuted, marginBottom: spacings.normalx },
  pastNote: {
    color: textMuted,
    marginBottom: spacings.large,
    lineHeight: hp(2.6),
  },
  // Kept mounted rather than unmounted, so switching days does not make the
  // whole screen jump as the grid reflows.
  hidden: { display: 'none' },
  recap: { marginTop: spacings.large },
  tiles: { marginTop: spacings.large, marginBottom: spacings.xxLarge },

  certified: {
    backgroundColor: okSoft,
    padding: spacings.large,
  },
  certifiedText: { color: okColor, marginLeft: spacings.normalx },
  certifyHint: { color: textMuted, marginBottom: spacings.large, lineHeight: hp(2.7) },
});
