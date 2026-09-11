import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppIcon, Card, EmptyState, icons } from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  appBg,
  dangerColor,
  dangerSoft,
  textBody,
  textDark,
  textFaint,
  textMuted,
  warnColor,
  warnSoft,
} from '../../constans/Color';
import { violations as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import { formatClock, isoDate, segmentsForDay } from '../../helpers/duty';

import { violationsForDay, type Violation } from '../../helpers/violations';
import { useNow } from '../../hooks/useNow';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';

/**
 * Where the driver stands against the rules.
 *
 * Nothing here is stored. Violations are worked out from the duty events every
 * time this screen opens, which is what makes a corrected log correct itself:
 * the office accepts a change, the day is rebuilt, and a breach that was never
 * real stops being reported. A violations table would have needed something to
 * go back and delete the row, and nothing ever does.
 *
 * The same rule engine the console runs — see helpers/violations.ts for what
 * it does not check, and why a copy rather than a shared package.
 */
export function MyViolationsScreen() {
  const { state } = useAuth();
  const profile = state.status === 'signedIn' ? state.profile : null;
  const { events, earliestDate } = useShift();
  const now = useNow();

  const book = profile?.limits ?? null;

  const found = useMemo<Violation[]>(() => {
    if (!book) return [];

    /*
     * Every loaded day, newest first. The cycle window for each day is the
     * days before it — so a day is judged against what had actually happened
     * by then, not against the whole eight days including its own future.
     */
    const cycleDays = book.cycleDays;
    const out: Violation[] = [];

    const cursor = new Date(now);
    while (isoDate(cursor) >= earliestDate) {
      const day = new Date(cursor);
      const today = segmentsForDay(events, day, now);

      const window: ReturnType<typeof segmentsForDay>[] = [];
      for (let back = cycleDays - 1; back >= 0; back--) {
        const earlier = new Date(day);
        earlier.setDate(day.getDate() - back);
        window.push(segmentsForDay(events, earlier, now));
      }

      /*
       * The day before, for the daily-rest check. A rest that began in a day
       * this phone never loaded would look like no rest at all, so the oldest
       * day gets [] and the check stands down rather than judging it.
       */
      const before = new Date(day);
      before.setDate(day.getDate() - 1);
      const yesterday =
        isoDate(before) >= earliestDate ? segmentsForDay(events, before, now) : [];

      out.push(...violationsForDay(book, isoDate(day), today, window, yesterday));
      cursor.setDate(cursor.getDate() - 1);
    }
    return out;
  }, [book, events, earliestDate, now]);

  /*
   * Grouped by day, newest first.
   *
   * A driver who overran on Tuesday usually broke two rules at once — the
   * driving limit and the window — and a flat list printed Tuesday's date on
   * each of them as though they were separate days. One heading says it once.
   */
  const byDay = useMemo(() => {
    const days = new Map<string, Violation[]>();
    for (const v of found) {
      const list = days.get(v.date);
      if (list) list.push(v);
      else days.set(v.date, [v]);
    }
    return [...days.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [found]);

  /* How far back the log on this phone reaches, for the summary line. */
  const windowDays = useMemo(() => {
    const from = new Date(`${earliestDate}T00:00:00`);
    return Math.max(1, Math.round((now.getTime() - from.getTime()) / 86_400_000) + 1);
  }, [earliestDate, now]);

  function pretty(iso: string): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  return (
    <View style={[BaseStyle.flex, styles.ground]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[fontStyle.fontSizeSmall2x, styles.subtitle]}>{t.subtitle}</Text>

        {/* No rule book means nothing can be judged. Saying so beats an empty
            list that reads as a clean record. */}
        {!book ? (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.notice]}>
            <AppIcon name={icons.alert} size={17} color={warnColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.noticeText]}>{t.noRegulator}</Text>
          </View>
        ) : found.length === 0 ? (
          <View style={styles.empty}>
            <EmptyState icon={icons.checkCircle} title={t.empty} hint={t.emptyHint} />
          </View>
        ) : (
          <>
            <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.count]}>
              {t.summary(found.length, windowDays)}
            </Text>

            {byDay.map(([date, ofDay]) => (
              <View key={date}>
                <Text
                  style={[
                    fontStyle.fontSizeSmall1x,
                    fontStyle.fontWeightMedium,
                    styles.dayHeading,
                  ]}>
                  {pretty(date).toUpperCase()}
                </Text>

                {ofDay.map(v => (
                  <Card key={v.id} style={styles.card}>
                    <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter]}>
                      <View
                        style={[
                          BaseStyle.alignJustifyCenter,
                          styles.badge,
                          !v.legal && styles.badgeFleet,
                        ]}>
                        <AppIcon
                          name={icons.alert}
                          size={18}
                          color={v.legal ? dangerColor : warnColor}
                        />
                      </View>
                      <View style={BaseStyle.flex}>
                        <Text
                          style={[
                            fontStyle.fontSizeNormal1x,
                            fontStyle.fontWeightMedium,
                            styles.title,
                          ]}>
                          {t.kind[v.kind]}
                        </Text>

                        {/*
                          Which kind of rule, and when — the two questions a
                          driver is asked about a breach and could not answer
                          from this card before.
                        */}
                        <View
                          style={[
                            BaseStyle.flexDirectionRow,
                            BaseStyle.alignItemsCenter,
                            styles.metaRow,
                          ]}>
                          <Text
                            style={[
                              fontStyle.fontSizeExtraSmall,
                              fontStyle.fontWeightMedium,
                              styles.tag,
                              v.legal ? styles.tagLegal : styles.tagFleet,
                            ]}>
                            {v.legal ? t.legal : t.fleet}
                          </Text>
                          {v.at !== null && (
                            <Text style={[fontStyle.fontSizeSmall1x, styles.at]}>
                              {t.at(formatClock(v.at))}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* What the rule is for. The figures below say what
                        happened; this says what it was meant to prevent. */}
                    <Text style={[fontStyle.fontSizeSmall2x, styles.detail]}>
                      {t.detail[v.kind]}
                    </Text>

                    <View style={styles.rows}>
                      <Row label={t.limit} value={v.limit} />
                      <Row label={t.actual} value={v.actual} />
                      <Row label={t.over} value={v.overage} strong />
                    </View>
                  </Card>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={[BaseStyle.flexDirectionRow, styles.row]}>
      <Text style={[fontStyle.fontSizeSmall2x, styles.rowLabel]}>{label}</Text>
      <Text
        style={[
          fontStyle.fontSizeSmall2x,
          strong ? fontStyle.fontWeightMedium : null,
          styles.rowValue,
          strong && styles.rowValueStrong,
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.ExtraLarge },
  subtitle: { color: textMuted, paddingTop: spacings.large, lineHeight: hp(2.4) },

  notice: {
    backgroundColor: warnSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  noticeText: { color: warnColor, marginLeft: spacings.normalx, flex: 1, lineHeight: hp(2.3) },

  empty: { marginTop: spacings.xxLarge },
  count: { color: textDark, marginTop: spacings.large },
  dayHeading: {
    color: textFaint,
    letterSpacing: 1,
    marginTop: spacings.xxLarge,
  },
  card: { marginTop: spacings.large },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: dangerSoft,
    marginRight: spacings.large,
  },
  badgeFleet: { backgroundColor: warnSoft },
  title: { color: textDark },
  metaRow: { marginTop: spacings.xsmall },
  tag: {
    borderRadius: 6,
    paddingHorizontal: spacings.small,
    paddingVertical: spacings.xxsmall,
    overflow: 'hidden',
  },
  tagLegal: { backgroundColor: dangerSoft, color: dangerColor },
  tagFleet: { backgroundColor: warnSoft, color: warnColor },
  at: { color: textFaint, marginLeft: spacings.normal },
  detail: { color: textMuted, marginTop: spacings.large, lineHeight: hp(2.3) },

  rows: { marginTop: spacings.large },
  row: { paddingVertical: spacings.small },
  rowLabel: { color: textMuted, width: '32%' },
  rowValue: { color: textBody, flex: 1 },
  rowValueStrong: { color: dangerColor },
});
