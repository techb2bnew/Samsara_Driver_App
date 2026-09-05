import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppIcon,
  Card,
  DutyGraph,
  EmptyState,
  ListRow,
  StatTile,
  icons,
} from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  appBg,
  dutyDrivingColor,
  dutyOffColor,
  dutyOnDutyColor,
  dutySleeperColor,
  okColor,
  okSoft,
  textDark,
  textFaint,
  textMuted,
} from '../../constans/Color';
import { dayLog as t, duty } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import {
  drivingMinutes,
  formatClock,
  formatTime,
  isoDate,
  longestBreakMinutes,
  onDutyMinutes,
  segmentsForDay,
} from '../../helpers/duty';
import { useNow } from '../../hooks/useNow';
import { useShift } from '../../context/ShiftContext';
import type { DutyStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<DutyStackParams, 'DayLog'>;

const STATUS_COLOR: Record<string, string> = {
  off_duty: dutyOffColor,
  sleeper_berth: dutySleeperColor,
  driving: dutyDrivingColor,
  on_duty_not_driving: dutyOnDutyColor,
};

const STATUS_LABEL: Record<string, string> = {
  off_duty: duty.status.off,
  sleeper_berth: duty.status.sleeper,
  driving: duty.status.driving,
  on_duty_not_driving: duty.status.on_duty,
};

/**
 * One day's log, read rather than worked.
 *
 * The Duty screen can already show any past day, so this is not a second copy
 * of that — it is the list BEHIND the graph. The graph answers "what shape was
 * my day"; this answers "what exactly did it record, and at what time", which
 * is the question a driver has when the graph looks wrong and the one an
 * inspector asks.
 *
 * Every event is a row with the time it started. The table stores no end time,
 * so a row's end is the next row's start — the same rule segmentsForDay
 * applies to draw the graph, which is why both are built from it here rather
 * than each doing its own arithmetic.
 */
export function DayLogScreen({ route, navigation }: Props) {
  const { date } = route.params;
  const { events, certifiedDates } = useShift();
  const now = useNow();

  const day = useMemo(() => new Date(`${date}T00:00:00`), [date]);
  const segments = useMemo(() => segmentsForDay(events, day, now), [events, day, now]);

  /* Sorted oldest first: a log is read down the page in the order it happened. */
  const ofDay = useMemo(
    () =>
      events
        .filter(e => isoDate(new Date(e.startedAt)) === date)
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
    [events, date],
  );

  const certified = certifiedDates.has(date);
  const pretty = day.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[fontStyle.fontSizeLargeX, fontStyle.fontWeightMedium1x, styles.title]}>
          {pretty}
        </Text>
        <Text style={[fontStyle.fontSizeSmall2x, styles.subtitle]}>{t.subtitle}</Text>

        {certified && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.certified]}>
            <AppIcon name={icons.checkCircle} size={18} color={okColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.certifiedText]}>
              {duty.certifiedOn}
            </Text>
          </View>
        )}

        {ofDay.length === 0 ? (
          <View style={styles.empty}>
            <EmptyState icon={icons.logbook} title={t.noEvents} hint={t.noEventsHint} />
          </View>
        ) : (
          <>
            <Card style={styles.graphCard}>
              <DutyGraph segments={segments} />
            </Card>

            <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
              {t.totals.toUpperCase()}
            </Text>
            <View style={[BaseStyle.flexDirectionRow, styles.tiles]}>
              <StatTile
                label={duty.drivingToday}
                value={formatClock(drivingMinutes(segments))}
                icon="car-outline"
                tone={dutyDrivingColor}
              />
              <StatTile
                label={duty.onDutyToday}
                value={formatClock(onDutyMinutes(segments))}
                icon="briefcase-outline"
                tone={dutyOnDutyColor}
              />
              <StatTile
                label={duty.longestBreak}
                value={formatClock(longestBreakMinutes(segments))}
                icon="cafe-outline"
              />
            </View>

            <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
              {t.events.toUpperCase()}
            </Text>
            <Card padded={false}>
              {ofDay.map((event, i) => (
                <ListRow
                  key={event.id}
                  icon={icons.duty}
                  tone={STATUS_COLOR[event.status]}
                  title={STATUS_LABEL[event.status] ?? event.status}
                  detail={t.eventAt(formatTime(event.startedAt))}
                  /*
                    A row the phone has not managed to send yet is labelled.
                    Duty changes are applied locally the moment they are tapped
                    and written when there is signal; without this the driver
                    cannot tell a recorded event from one still sitting on the
                    phone, which matters most in exactly the place it happens —
                    somewhere with no bars.
                  */
                  extra={
                    event.id.startsWith('local-')
                      ? t.queued
                      : event.correction === 'pending'
                        ? t.correctionPending
                        : event.correction === 'rejected'
                          ? t.correctionRejected
                          : undefined
                  }
                  onPress={() => navigation.navigate('RequestCorrection', { eventId: event.id })}
                  last={i === ofDay.length - 1}
                />
              ))}
            </Card>

            <Text style={[fontStyle.fontSizeSmall1x, styles.correctHint]}>{t.tapToCorrect}</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.ExtraLarge },

  title: { color: textDark, paddingTop: spacings.large },
  subtitle: { color: textMuted, marginTop: spacings.xxsmall },

  certified: {
    backgroundColor: okSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  certifiedText: { color: okColor, marginLeft: spacings.normalx, flex: 1 },

  empty: { marginTop: spacings.xxLarge },
  graphCard: { marginTop: spacings.xxLarge },
  section: {
    color: textFaint,
    letterSpacing: 1.1,
    marginTop: spacings.xxLarge,
    marginBottom: spacings.large,
  },
  tiles: { marginBottom: spacings.normal },
  correctHint: {
    color: textMuted,
    marginTop: spacings.large,
    textAlign: 'center',
    lineHeight: hp(2.3),
  },
});
