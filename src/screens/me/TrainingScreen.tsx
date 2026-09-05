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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon, Card, EmptyState, ListRow, icons } from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  appBg,
  dangerColor,
  dangerSoft,
  okColor,
  textFaint,
  textMuted,
  warnColor,
} from '../../constans/Color';
import { training as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import type { MeStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MeStackParams, 'Training'>;

/** "12 Aug", short because it sits on a second line under the title. */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * The line under a course title.
 *
 * The deadline comes first when there is one: a driver scanning this list is
 * deciding what to do next, and that is a question about dates, not minutes.
 */
function detailFor(course: api.MyCourse): string {
  const parts: string[] = [];
  if (course.completedAt) {
    parts.push(t.completedOn(shortDate(course.completedAt)));
  } else if (course.dueOn) {
    parts.push(t.dueBy(shortDate(course.dueOn)));
  } else {
    parts.push(t.noDeadline);
  }
  const minutes = t.minutes(course.lengthMinutes);
  if (minutes) parts.push(minutes);
  return parts.join(' · ');
}

export function TrainingScreen({ navigation }: Props) {
  const { state } = useAuth();
  const driverId = state.status === 'signedIn' ? state.profile.driverId : null;

  const { data, loading, refreshing, error, reload, reloadQuietly } = useAsync(
    () => (driverId ? api.loadMyCourses(driverId) : Promise.resolve([])),
    [driverId],
  );

  /*
    Reloaded on focus, not only on mount. A driver comes back here straight
    from finishing a course, and this screen was never unmounted while they
    were on it — without this the course they just completed still says
    "in progress".
  */
  useFocusEffect(
    useCallback(() => {
      // Quiet: coming back to a tab should update the rows, not flash a
      // spinner over rows that are already correct.
      reloadQuietly();
      // reload is recreated on every render, so depending on it here would
      // reload in a loop.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [driverId]),
  );

  const courses = data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  /*
    Overdue outranks whatever the row says. A course due last week is overdue
    whether the driver started it or not, and nothing runs overnight to write
    that status down.
  */
  const isOverdue = (c: api.MyCourse) => !c.completedAt && c.dueOn !== null && c.dueOn < today;

  const todo = courses.filter(c => !c.completedAt);
  const done = courses.filter(c => c.completedAt);

  function toneFor(course: api.MyCourse): string {
    if (course.completedAt) return okColor;
    if (isOverdue(course)) return dangerColor;
    if (course.status === 'in_progress') return warnColor;
    return accentColor;
  }

  function statusFor(course: api.MyCourse): string {
    if (course.completedAt) return t.completed;
    if (isOverdue(course)) return t.overdue;
    if (course.status === 'in_progress') return t.inProgress;
    return t.notStarted;
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

        {Boolean(error) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{error}</Text>
          </View>
        )}

        {loading && courses.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : courses.length === 0 ? (
          <EmptyState
            icon={icons.logbook}
            title={t.empty}
            hint={t.emptyHint}
          />
        ) : (
          <>
            {todo.length > 0 && (
              <>
                <Text
                  style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
                  {t.todo.toUpperCase()}
                </Text>
                <Card padded={false}>
                  {todo.map((course, i) => (
                    <ListRow
                      key={course.assignmentId}
                      icon={icons.logbook}
                      tone={toneFor(course)}
                      title={course.title}
                      detail={detailFor(course)}
                      extra={statusFor(course)}
                      onPress={() =>
                        navigation.navigate('Course', { assignmentId: course.assignmentId })
                      }
                      last={i === todo.length - 1}
                    />
                  ))}
                </Card>
              </>
            )}

            {done.length > 0 && (
              <>
                <Text
                  style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
                  {t.done.toUpperCase()}
                </Text>
                <Card padded={false}>
                  {done.map((course, i) => (
                    <ListRow
                      key={course.assignmentId}
                      icon={icons.checkCircle}
                      tone={okColor}
                      title={course.title}
                      detail={detailFor(course)}
                      onPress={() =>
                        navigation.navigate('Course', { assignmentId: course.assignmentId })
                      }
                      last={i === done.length - 1}
                    />
                  ))}
                </Card>
              </>
            )}
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
  loading: { paddingVertical: hp(8), alignItems: 'center' },
  error: {
    backgroundColor: dangerSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
});
