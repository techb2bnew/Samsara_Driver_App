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
import { isoDate, segmentsForDay } from '../../helpers/duty';
import { cycleDaysFor, regulatorFrom } from '../../helpers/hosLimits';
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

  const book = regulatorFrom(profile?.regulator ?? null);

  const found = useMemo<Violation[]>(() => {
    if (!book) return [];

    /*
     * Every loaded day, newest first. The cycle window for each day is the
     * days before it — so a day is judged against what had actually happened
     * by then, not against the whole eight days including its own future.
     */
    const cycleDays = cycleDaysFor(book);
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

      out.push(...violationsForDay(book, isoDate(day), today, window));
      cursor.setDate(cursor.getDate() - 1);
    }
    return out;
  }, [book, events, earliestDate, now]);

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
          found.map((v) => (
            <Card key={v.id} style={styles.card}>
              <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter]}>
                <View style={[BaseStyle.alignJustifyCenter, styles.badge]}>
                  <AppIcon name={icons.alert} size={18} color={dangerColor} />
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
                  <Text style={[fontStyle.fontSizeSmall1x, styles.date]}>{pretty(v.date)}</Text>
                </View>
              </View>

              <View style={styles.rows}>
                <Row label={t.limit} value={v.limit} />
                <Row label={t.actual} value={v.actual} />
                <Row label={t.over} value={v.overage} strong />
              </View>
            </Card>
          ))
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
  card: { marginTop: spacings.large },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: dangerSoft,
    marginRight: spacings.large,
  },
  title: { color: textDark },
  date: { color: textFaint, marginTop: spacings.xxsmall },

  rows: { marginTop: spacings.large },
  row: { paddingVertical: spacings.small },
  rowLabel: { color: textMuted, width: '32%' },
  rowValue: { color: textBody, flex: 1 },
  rowValueStrong: { color: dangerColor },
});
