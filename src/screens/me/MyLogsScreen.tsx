import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Badge, Card, EmptyState, ListRow, icons } from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  appBg,
  okColor,
  okSoft,
  textFaint,
  textMuted,
  warnColor,
  warnSoft,
} from '../../constans/Color';
import { myLogs as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import {
  drivingMinutes,
  formatClock,
  isoDate,
  onDutyMinutes,
  segmentsForDay,
} from '../../helpers/duty';
import { useNow } from '../../hooks/useNow';
import { useShift } from '../../context/ShiftContext';
import type { MeStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MeStackParams, 'MyLogs'>;

/**
 * Every day the phone holds, and whether it was signed.
 *
 * Built from the events the shift already loaded rather than queried again.
 * The window is eight days because that is what the cycle needs; this screen
 * says so out loud rather than showing a driver a short list and letting them
 * conclude their older logs are gone.
 *
 * Days with nothing recorded are still listed. A missing day is the thing a
 * compliance officer asks about, so it is not something to hide from the
 * driver who would have to explain it.
 */
export function MyLogsScreen({ navigation }: Props) {
  const { events, certifiedDates, earliestDate } = useShift();
  const now = useNow();

  const days = useMemo(() => {
    const out: Array<{
      key: string;
      label: string;
      driving: number;
      onDuty: number;
      empty: boolean;
      certified: boolean;
    }> = [];

    /* Newest first: a driver opening this is looking at yesterday, not last week. */
    const cursor = new Date(now);
    while (isoDate(cursor) >= earliestDate) {
      const key = isoDate(cursor);
      const segments = segmentsForDay(events, cursor, now);
      out.push({
        key,
        label: cursor.toLocaleDateString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        driving: drivingMinutes(segments),
        onDuty: onDutyMinutes(segments),
        empty: segments.length === 0,
        certified: certifiedDates.has(key),
      });
      cursor.setDate(cursor.getDate() - 1);
    }
    return out;
  }, [events, certifiedDates, earliestDate, now]);

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[fontStyle.fontSizeSmall2x, styles.subtitle]}>{t.subtitle}</Text>

        {days.length === 0 ? (
          <View style={styles.empty}>
            <EmptyState icon={icons.logbook} title={t.empty} hint={t.emptyHint} />
          </View>
        ) : (
          <>
            <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
              {t.window(days.length).toUpperCase()}
            </Text>
            <Card padded={false}>
              {days.map((day, i) => (
                <ListRow
                  key={day.key}
                  icon={day.certified ? icons.checkCircle : icons.logbook}
                  tone={day.certified ? okColor : day.empty ? textFaint : warnColor}
                  title={day.label}
                  detail={
                    day.empty
                      ? t.noEvents
                      : t.hours(formatClock(day.driving), formatClock(day.onDuty))
                  }
                  trailing={
                    day.empty ? undefined : (
                      <Badge
                        label={day.certified ? t.certified : t.uncertified}
                        color={day.certified ? okColor : warnColor}
                        background={day.certified ? okSoft : warnSoft}
                      />
                    )
                  }
                  onPress={() => navigation.navigate('DayLog', { date: day.key })}
                  last={i === days.length - 1}
                />
              ))}
            </Card>

            <Text style={[fontStyle.fontSizeSmall1x, styles.older]}>{t.olderHint}</Text>
          </>
        )}
      </ScrollView>
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
  empty: { marginTop: spacings.xxLarge },
  older: {
    color: textMuted,
    marginTop: spacings.large,
    textAlign: 'center',
    lineHeight: hp(2.2),
  },
});
