import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
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
  cardBgSoft,
  dutyDrivingColor,
  dutyOffColor,
  dutyOnDutyColor,
  dutySleeperColor,
  okColor,
  okSoft,
  onAccent,
  selectedWash,
  shadowColor,
  textDark,
  textFaint,
  textMuted,
} from '../../constans/Color';
import { common, dayLog, duty as t, screenTitles, training } from '../../constans/Constants';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';
import { useShift } from '../../context/ShiftContext';
import {
  currentStatus,
  drivingMinutes,
  formatClock,
  formatTime,
  isoDate,
  longestBreakMinutes,
  minutesSince,
  onDutyMinutes,
  segmentsForDay,
} from '../../helpers/duty';
import { recapFor } from '../../helpers/hosLimits';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { displayName } from '../../helpers/names';
import { useAsync } from '../../hooks/useAsync';
import { useNow } from '../../hooks/useNow';
import * as api from '../../supabase/api';
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
 * The status buttons are colour-coded to the graph rows. Changing status is
 * the single most consequential thing a driver does in the app — it is their
 * legal record — and a mis-tap is a false log.
 */
export function DutyHomeScreen({ navigation }: Props) {
  const { state } = useAuth();
  const profile = state.status === 'signedIn' ? state.profile : null;
  const {
    refreshing,
    error,
    vehicle,
    events,
    certifiedDates,
    earliestDate,
    refreshVisibly,
    changeStatus,
    certifyDay,
  } = useShift();

  const { unreadCount } = useNotifications();

  /*
   * Training the driver still owes.
   *
   * Read here rather than left to the Me tab, because a course nobody opens is
   * a course nobody does — Me → Training is four taps away and there is
   * nothing on the screen a driver actually uses to say anything is waiting.
   *
   * Quiet on focus: coming back from finishing one should make the card go
   * away without flashing a spinner over the duty screen.
   */
  const { data: courses, reloadQuietly: reloadCourses } = useAsync(
    () => (profile ? api.loadMyCourses(profile.driverId) : Promise.resolve([])),
    [profile?.driverId],
  );

  useFocusEffect(
    useCallback(() => {
      reloadCourses();
    }, [reloadCourses]),
  );

  const owed = (courses ?? []).filter((c) => !c.completedAt);
  const overdue = owed.filter(
    (c) => c.dueOn !== null && c.dueOn < new Date().toISOString().slice(0, 10),
  ).length;
  const [confirming, setConfirming] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  /*
   * The clock, ticking on the minute.
   *
   * This used to be `useMemo(() => new Date(), [])` — read once when the
   * screen mounted and never again. Everything below is a function of it: the
   * segment the driver is in right now has no end time in the table, so the
   * graph draws it up to "now", and the three totals measure up to "now" too.
   * Frozen, a driver who came on duty at 09:00 and glanced at the screen at
   * 11:00 saw two hours of work reported as nothing at all.
   */
  const now = useNow();
  const today = now;

  /*
   * Which day is on screen. Today by default, and never later than today —
   * see DayPicker. A driver reviews yesterday's log before certifying it, or
   * the day a roadside inspector asked about.
   */
  const [viewDate, setViewDate] = useState(today);
  const viewKey = isoDate(viewDate);
  const todayKey = isoDate(today);
  const isToday = viewKey === todayKey;

  /*
   * Follow the day over midnight.
   *
   * A phone in a cradle is open across the day boundary every night shift, and
   * "today" is no longer fixed at mount. Without this the screen would keep
   * showing the day that just ended, which is not merely stale: past days hide
   * the status buttons — deliberately, because a driver cannot go on duty in
   * the past — so at 00:00 the driver would lose the ability to change status
   * with nothing on screen to explain why.
   *
   * Only moved when they were watching today. A driver who has paged back to
   * review Tuesday should stay on Tuesday.
   */
  const lastTodayKey = useRef(todayKey);
  useEffect(() => {
    if (todayKey === lastTodayKey.current) return;
    const wasWatchingToday = viewKey === lastTodayKey.current;
    lastTodayKey.current = todayKey;
    if (wasWatchingToday) setViewDate(new Date());
  }, [todayKey, viewKey]);

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

    const book = profile?.limits ?? null;
    if (!book) return recapFor(null, segments, []);

    const days: ReturnType<typeof segmentsForDay>[] = [];
    for (let back = book.cycleDays - 1; back >= 0; back--) {
      const day = new Date(today);
      day.setDate(today.getDate() - back);
      days.push(segmentsForDay(events, day, today));
    }
    return recapFor(book, segments, days);
  }, [isToday, profile?.limits, events, segments, today]);
  const activeEvent = currentStatus(events);
  const activeStatus = activeEvent?.status ?? null;
  const activeChoice = CHOICES.find(c => c.status === activeStatus) ?? CHOICES[0];

  async function pick(status: DutyStatus) {
    if (status === activeStatus) return;

    // Hours attach to a vehicle. Going on duty with none would record a shift
    // against nothing, and report_position would have no truck to move.
    if (!vehicle && status !== 'off_duty') {
      setFailure(t.noVehicle);
      return;
    }

    setFailure(null);
    try {
      await changeStatus(status);
    } catch {
      setFailure(t.changeFailed);
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
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              refreshVisibly().catch(() => {});
            }}
            tintColor={accentColor}
          />
        }>
        <View
          style={[
            BaseStyle.flexDirectionRow,
            BaseStyle.alignItemsCenter,
            BaseStyle.justifyContentSpaceBetween,
            styles.topBar,
          ]}>
          <View>
            <Text style={[fontStyle.fontSizeSmall2x, styles.eyebrow]}>{t.title.toUpperCase()}</Text>
            <Text style={[fontStyle.fontSizeLargeX, fontStyle.fontWeightMedium1x, styles.greeting]}>
              {profile ? t.hello(displayName(profile.firstName)) : ''}
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={screenTitles.notifications}
            activeOpacity={0.75}
            delayPressIn={0}
            onPress={() => navigation.navigate('Notifications')}
            style={[BaseStyle.alignJustifyCenter, styles.bell]}>
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
          </TouchableOpacity>
        </View>

        {/* Status + truck in one place: this is what the driver came here to see. */}
        <View style={styles.hero}>
          <View style={[styles.heroBar, { backgroundColor: activeChoice.color }]} />
          <View style={styles.heroBody}>
            <View style={BaseStyle.flex}>
              <Text style={[fontStyle.fontSizeSmall1x, fontStyle.fontWeightMedium, styles.heroKicker]}>
                {t.title}
              </Text>
              <Text style={[fontStyle.fontSizeLargeX, fontStyle.fontWeightMedium1x, styles.heroStatus]}>
                {activeChoice.label}
              </Text>
              {/*
                The elapsed time next to the start time is what makes the
                screen visibly live. A 24 hour graph grows by a
                fourteen-hundredth of its width in a minute, which is true but
                invisible; "1:23" changing to "1:24" is the same fact a driver
                can actually see.
              */}
              {Boolean(activeEvent) && (
                <Text style={[fontStyle.fontSizeSmall2x, styles.heroSince]}>
                  {`${t.since(formatTime(activeEvent!.startedAt))} ${t.elapsed(
                    formatClock(minutesSince(activeEvent!.startedAt, now)),
                  )}`}
                </Text>
              )}
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              delayPressIn={0}
              onPress={() => navigation.navigate('VehiclePicker')}
              style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.truckChip]}>
              <View style={[BaseStyle.alignJustifyCenter, styles.truckBadge]}>
                <AppIcon name={icons.truck} size={16} color={accentColor} />
              </View>
              <View style={styles.truckMeta}>
                <Text
                  numberOfLines={1}
                  style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.truckName]}>
                  {vehicle ? vehicle.name : t.noVehicle}
                </Text>
                {Boolean(vehicle) && (
                  <Text numberOfLines={1} style={[fontStyle.fontSizeExtraSmall, styles.truckPlate]}>
                    {vehicle!.plate}
                  </Text>
                )}
              </View>
              <AppIcon name={icons.forward} size={14} color={textFaint} />
            </TouchableOpacity>
          </View>
        </View>

        {!isToday && (
          <Text style={[fontStyle.fontSizeSmall2x, styles.pastNote]}>{t.pastDayNote}</Text>
        )}

        <View
          style={[
            BaseStyle.flexDirectionRow,
            BaseStyle.justifyContentSpaceBetween,
            styles.grid,
            !isToday && styles.hidden,
          ]}>
          {CHOICES.map(choice => {
            const active = choice.status === activeStatus;
            return (
              <TouchableOpacity
                key={choice.status}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                activeOpacity={0.82}
                delayPressIn={0}
                onPress={() => pick(choice.status)}
                style={[
                  BaseStyle.alignJustifyCenter,
                  styles.choice,
                  active && { backgroundColor: choice.color },
                ]}>
                <View
                  style={[
                    BaseStyle.alignJustifyCenter,
                    styles.choiceIcon,
                    { backgroundColor: active ? selectedWash : `${choice.color}22` },
                  ]}>
                  <AppIcon name={choice.icon} size={20} color={active ? onAccent : choice.color} />
                </View>
                <Text
                  numberOfLines={2}
                  style={[
                    fontStyle.fontSizeExtraSmall,
                    fontStyle.fontWeightMedium,
                    styles.choiceLabel,
                    { color: active ? onAccent : textDark },
                  ]}>
                  {choice.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {Boolean(failure || error) && (
          <View
            style={[
              BaseStyle.flexDirectionRow,
              BaseStyle.alignItemsCenter,
              styles.failure,
            ]}>
            <AppIcon name={icons.alert} size={17} color={accentColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.failureText]}>
              {failure ?? error}
            </Text>
          </View>
        )}

        {/*
          Only when something is outstanding, and gone the moment it is not.
          A permanent "Training" tile is a tile that stops being read.
        */}
        {owed.length > 0 && (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            delayPressIn={0}
            onPress={() =>
              /*
               * Straight to the course when there is one, the list when there
               * are several. Landing on a list of one is a tap for nothing.
               */
              owed.length === 1
                ? navigation.navigate('Course', { assignmentId: owed[0].assignmentId })
                : navigation.navigate('Training')
            }
            style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.training]}>
            <View style={[BaseStyle.alignJustifyCenter, styles.trainingBadge]}>
              <AppIcon name={icons.logbook} size={19} color={accentColor} />
            </View>
            <View style={BaseStyle.flex}>
              <Text
                style={[
                  fontStyle.fontSizeNormal1x,
                  fontStyle.fontWeightMedium,
                  styles.trainingTitle,
                ]}>
                {owed.length === 1 ? training.waitingOne : training.waitingMany(owed.length)}
              </Text>
              <Text style={[fontStyle.fontSizeSmall2x, styles.trainingHint]}>
                {overdue > 0
                  ? training.waitingOverdue(overdue)
                  : owed.length === 1
                    ? training.waitingHint
                    : training.waitingHintMany}
              </Text>
            </View>
            <AppIcon name={icons.forward} size={17} color={textFaint} />
          </TouchableOpacity>
        )}

        {recap && (
          <View style={styles.recap}>
            <HosRecap recap={recap} />
          </View>
        )}

        <View style={styles.logCard}>
          <DayPicker embedded date={viewDate} earliest={earliestDate} onChange={setViewDate} />
          {viewKey === earliestDate && (
            <Text style={[fontStyle.fontSizeExtraSmall, styles.oldest]}>{t.oldestLoaded}</Text>
          )}
          <View style={styles.graph}>
            <DutyGraph segments={segments} />
          </View>

          {/*
            The way into the day log, which had none. The graph shows the shape
            of a day; a driver who thinks it is wrong needs the rows behind it,
            with the times, and somewhere to challenge one.
          */}
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.75}
            delayPressIn={0}
            disabled={segments.length === 0}
            onPress={() => navigation.navigate('DayLog', { date: viewKey })}
            style={[
              BaseStyle.flexDirectionRow,
              BaseStyle.alignItemsCenter,
              styles.logLink,
              segments.length === 0 && styles.logLinkOff,
            ]}>
            <AppIcon name={icons.logbook} size={17} color={accentColor} />
            <Text
              style={[
                fontStyle.fontSizeSmall2x,
                fontStyle.fontWeightMedium,
                styles.logLinkText,
              ]}>
              {dayLog.events}
            </Text>
            <AppIcon name={icons.forward} size={15} color={textFaint} />
          </TouchableOpacity>
        </View>

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
            tone={dutyOnDutyColor}
          />
          <StatTile
            label={t.longestBreak}
            value={formatClock(longestBreakMinutes(segments))}
            icon="cafe-outline"
          />
        </View>

        {certified ? (
          <View
            style={[
              BaseStyle.flexDirectionRow,
              BaseStyle.alignItemsCenter,
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

  topBar: { paddingTop: spacings.xxLarge },
  eyebrow: { color: textFaint, letterSpacing: 1.2 },
  greeting: { color: textDark, marginTop: spacings.xxsmall },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: cardBg,
    shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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

  hero: {
    backgroundColor: cardBg,
    borderRadius: 20,
    marginTop: spacings.xxLarge,
    overflow: 'hidden',
    shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroBar: { height: 4 },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacings.xxLarge,
    paddingVertical: spacings.xLarge,
  },
  heroKicker: { color: textFaint, letterSpacing: 0.4 },
  heroStatus: { color: textDark, marginTop: spacings.xxsmall },
  heroSince: { color: textMuted, marginTop: spacings.small },
  truckChip: {
    maxWidth: '48%',
    backgroundColor: cardBgSoft,
    borderRadius: 14,
    paddingVertical: spacings.normal,
    paddingHorizontal: spacings.normalx,
  },
  truckBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: cardBg,
  },
  truckMeta: { flexShrink: 1, marginHorizontal: spacings.normal },
  truckName: { color: textDark },
  truckPlate: { color: textMuted, marginTop: spacings.xxsmall },

  grid: { marginTop: spacings.large },
  choice: {
    width: '23.5%',
    minHeight: hp(11),
    backgroundColor: cardBg,
    borderRadius: 16,
    paddingVertical: spacings.large,
    paddingHorizontal: spacings.xsmall,
    shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  choiceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  choiceLabel: { marginTop: spacings.normal, textAlign: 'center' },

  failure: {
    backgroundColor: accentSoft,
    borderRadius: 14,
    paddingVertical: spacings.large,
    paddingHorizontal: spacings.large,
    marginTop: spacings.large,
  },
  failureText: { color: accentColor, marginLeft: spacings.normalx, flex: 1 },

  training: {
    backgroundColor: cardBg,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: accentColor,
    padding: spacings.xLarge,
    marginTop: spacings.large,
    shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  trainingBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: accentSoft,
    marginRight: spacings.large,
  },
  trainingTitle: { color: textDark },
  trainingHint: { color: textMuted, marginTop: spacings.xxsmall },

  recap: { marginTop: spacings.large },
  logCard: {
    backgroundColor: cardBg,
    borderRadius: 20,
    padding: spacings.xxLarge,
    marginTop: spacings.xxLarge,
    shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  graph: {
    marginTop: spacings.xLarge,
    paddingTop: spacings.xLarge,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: borderColor,
  },
  oldest: { color: textMuted, marginTop: spacings.normal, textAlign: 'center' },
  logLink: {
    marginTop: spacings.xLarge,
    paddingTop: spacings.large,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: borderColor,
  },
  logLinkText: { color: textDark, flex: 1, marginLeft: spacings.normalx },
  logLinkOff: { opacity: 0.4 },
  pastNote: {
    color: textMuted,
    marginTop: spacings.large,
    lineHeight: hp(2.6),
  },
  // Kept mounted rather than unmounted, so switching days does not make the
  // whole screen jump as the grid reflows.
  hidden: { display: 'none' },
  tiles: { marginTop: spacings.large, marginBottom: spacings.xxLarge },

  certified: {
    backgroundColor: okSoft,
    borderRadius: 16,
    padding: spacings.xLarge,
  },
  certifiedText: { color: okColor, marginLeft: spacings.normalx },
  certifyHint: { color: textMuted, marginBottom: spacings.large, lineHeight: hp(2.7) },
});
