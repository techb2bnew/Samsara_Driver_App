import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppIcon,
  Card,
  ConfirmModal,
  CustomButton,
  EmptyState,
  icons,
} from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  appBg,
  dangerColor,
  dangerSoft,
  okColor,
  okSoft,
  textBody,
  textDark,
  textFaint,
  textMuted,
} from '../../constans/Color';
import { common, training as t } from '../../constans/Constants';
import { heightPercentageToDP as hp } from '../../utils';
import * as api from '../../supabase/api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import type { MeStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MeStackParams, 'Course'>;

/** Seconds as "9:05", the shape a driver already reads on a phone. */
function clock(totalSeconds: number): string {
  const whole = Math.max(0, Math.floor(totalSeconds));
  return t.clock(Math.floor(whole / 60), whole % 60);
}

/**
 * One course: what to read, the file to open, and the time gate on finishing.
 *
 * The timer is a gate, not proof. It stops a driver marking a ten minute
 * course done in four seconds, which is the only thing a tick box could ever
 * record. It cannot know whether they read it, and nothing here pretends to —
 * a driver who wants to skip training can leave the screen open.
 *
 * Time is measured from a wall clock, not by counting ticks. The material
 * opens in the phone's own PDF or video viewer, so this screen is in the
 * background for most of the course; a phone throttles timers there, and a
 * tick count would come back minutes short of the truth.
 */
export function CourseScreen({ route, navigation }: Props) {
  const { assignmentId } = route.params;
  const { state } = useAuth();
  const driverId = state.status === 'signedIn' ? state.profile.driverId : null;

  const { data, loading, refreshing, error, reload } = useAsync(
    () => (driverId ? api.loadMyCourses(driverId) : Promise.resolve([])),
    [driverId],
  );

  const course = (data ?? []).find(c => c.assignmentId === assignmentId) ?? null;

  /*
    Seconds already banked, either from the row or from a sitting this screen
    has already stopped. A ref rather than state: the save on the way out reads
    it from inside a cleanup, where a state value would be the one captured
    when the effect ran.
  */
  const banked = useRef(0);
  /** Wall clock at the moment the timer last started, or null when stopped. */
  const startedAt = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  /** Re-renders once a second so the countdown moves. Value is not read. */
  const [, setBeat] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  /*
    Whether this screen should still be writing progress at all.

    Turned off in two cases, and both of them were bugs without it. A course
    the driver only opened to look at again would have its completed status
    written back to "in progress" by the save on the way out; and marking a
    course done navigates back, which unmounts this screen and fires that same
    save a moment after the completed row landed.
  */
  const writable = useRef(true);

  /* Whatever was already on the row becomes the starting point, once. */
  const seeded = useRef(false);
  useEffect(() => {
    if (course && !seeded.current) {
      banked.current = course.secondsSpent;
      seeded.current = true;
      if (course.completedAt) writable.current = false;
      setBeat(n => n + 1);
    }
  }, [course]);

  const elapsed = useCallback(
    () =>
      banked.current +
      (startedAt.current === null ? 0 : (Date.now() - startedAt.current) / 1000),
    [],
  );

  const stop = useCallback(() => {
    if (startedAt.current !== null) {
      banked.current += (Date.now() - startedAt.current) / 1000;
      startedAt.current = null;
    }
    setRunning(false);
  }, []);

  const save = useCallback(
    async (status: 'in_progress' | 'completed') => {
      await api.saveCourseProgress(assignmentId, {
        status,
        secondsSpent: elapsed(),
        at: new Date().toISOString(),
      });
    },
    [assignmentId, elapsed],
  );

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setBeat(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  /*
    Saved when the app goes to the background as well as when the screen is
    left. A driver reading a PDF gets the app killed behind them often enough
    that "it did not count" would otherwise be the normal experience.
  */
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active' && writable.current && startedAt.current !== null) {
        // The clock keeps running — the driver is in the file, which is the
        // course. Only the banked total is written out.
        api
          .saveCourseProgress(assignmentId, {
            status: 'in_progress',
            secondsSpent: elapsed(),
            at: new Date().toISOString(),
          })
          .catch(() => {});
      }
    });
    return () => sub.remove();
  }, [assignmentId, elapsed]);

  /* One last write on the way out, so a back tap does not lose the sitting. */
  useEffect(
    () => () => {
      if (writable.current && (startedAt.current !== null || banked.current > 0)) {
        api
          .saveCourseProgress(assignmentId, {
            status: 'in_progress',
            secondsSpent:
              banked.current +
              (startedAt.current === null ? 0 : (Date.now() - startedAt.current) / 1000),
            at: new Date().toISOString(),
          })
          .catch(() => {});
      }
    },
    [assignmentId],
  );

  const finished = Boolean(course?.completedAt);
  const required = (course?.lengthMinutes ?? 0) * 60;
  const spent = elapsed();
  const remaining = Math.max(0, required - spent);
  /* No length set means no gate. An office that left it blank did not ask for one. */
  const canFinish = required === 0 || spent >= required;

  function begin() {
    startedAt.current = Date.now();
    setRunning(true);
    setSaveError(null);
    /*
      Written immediately rather than on the first pause. The office asking
      "has anyone opened this" should get an answer the moment someone does,
      and this is what puts started_at on the row.
    */
    save('in_progress').catch(() => {});
  }

  async function pause() {
    stop();
    setSaving(true);
    setSaveError(null);
    try {
      await save('in_progress');
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : t.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function openFile() {
    if (!course?.contentPath) return;
    setOpening(true);
    setSaveError(null);
    try {
      const url = await api.courseContentUrl(course.contentPath);
      if (url) await Linking.openURL(url);
    } catch {
      setSaveError(t.openFailed);
    } finally {
      setOpening(false);
    }
  }

  async function markDone() {
    stop();
    setSaving(true);
    setSaveError(null);
    try {
      await save('completed');
      // Before goBack, so the unmount save cannot land after this one and
      // put the row back to "in progress".
      writable.current = false;
      setConfirming(false);
      navigation.goBack();
    } catch (cause) {
      setConfirming(false);
      setSaveError(cause instanceof Error ? cause.message : t.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !course) {
    return (
      <View style={[BaseStyle.flex, BaseStyle.alignJustifyCenter, styles.ground]}>
        <ActivityIndicator color={accentColor} />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={[BaseStyle.flex, styles.ground]}>
        <View style={styles.body}>
          <EmptyState
            icon={icons.logbook}
            title={error ?? common.somethingWrong}
            actionLabel={common.retry}
            onAction={reload}
          />
        </View>
      </View>
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
        <Text style={[fontStyle.fontSizeLargeX, fontStyle.fontWeightMedium1x, styles.title]}>
          {course.title}
        </Text>
        <Text style={[fontStyle.fontSizeSmall2x, styles.meta]}>
          {[t.minutes(course.lengthMinutes), course.dueOn ? t.dueBy(course.dueOn) : t.noDeadline]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        {finished && (
          <View
            style={[
              BaseStyle.flexDirectionRow,
              BaseStyle.alignItemsCenter,
              styles.banner,
              styles.bannerOk,
            ]}>
            <AppIcon name={icons.checkCircle} size={18} color={okColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.bannerOkText]}>{t.alreadyDone}</Text>
          </View>
        )}

        <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
          {t.aboutThis.toUpperCase()}
        </Text>
        <Card>
          <Text style={[fontStyle.fontSizeNormal1x, styles.prose]}>
            {course.description ?? t.noDescription}
          </Text>
        </Card>

        <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
          {t.material.toUpperCase()}
        </Text>
        <Card>
          {course.contentPath ? (
            <>
              <CustomButton
                title={t.openFile}
                icon={icons.download}
                variant="outline"
                loading={opening}
                onPress={() => {
                  openFile().catch(() => {});
                }}
              />
              <Text style={[fontStyle.fontSizeSmall1x, styles.hint]}>{t.openHint}</Text>
            </>
          ) : (
            <Text style={[fontStyle.fontSizeSmall2x, styles.hintOnly]}>{t.noFile}</Text>
          )}
        </Card>

        {!finished && (
          <>
            <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
              {(required > 0 ? t.timeLeft : t.spentSoFar).toUpperCase()}
            </Text>
            <Card>
              <View style={[BaseStyle.alignItemsCenter, styles.clockBox]}>
                <Text
                  style={[
                    fontStyle.fontSizeExtraLarge,
                    fontStyle.fontWeightMedium1x,
                    styles.clockText,
                    canFinish && styles.clockDone,
                  ]}>
                  {clock(required > 0 ? remaining : spent)}
                </Text>
                <Text style={[fontStyle.fontSizeSmall1x, styles.clockHint]}>
                  {canFinish
                    ? t.readyHint
                    : t.gateHint(course.lengthMinutes ?? 0)}
                </Text>
              </View>

              <CustomButton
                title={running ? t.pause : banked.current > 0 ? t.resume : t.start}
                icon={running ? icons.close : icons.forward}
                variant={running ? 'outline' : 'primary'}
                loading={saving && !confirming}
                onPress={() => {
                  if (running) {
                    pause().catch(() => {});
                  } else {
                    begin();
                  }
                }}
              />

              <CustomButton
                title={t.markDone}
                icon={icons.check}
                variant="primary"
                disabled={!canFinish}
                style={styles.doneButton}
                onPress={() => setConfirming(true)}
              />
            </Card>
          </>
        )}

        {Boolean(saveError) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={17} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{saveError}</Text>
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={confirming}
        title={t.markDoneConfirm}
        message={t.markDoneHint}
        confirmLabel={t.markDone}
        icon={icons.checkCircle}
        loading={saving}
        onConfirm={() => {
          markDone().catch(() => {});
        }}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.ExtraLarge },

  title: { color: textDark, paddingTop: spacings.large },
  meta: { color: textMuted, marginTop: spacings.xxsmall },

  section: {
    color: textFaint,
    letterSpacing: 1.1,
    marginTop: spacings.xxLarge,
    marginBottom: spacings.large,
  },
  prose: { color: textBody, lineHeight: hp(2.8) },
  hint: { color: textMuted, marginTop: spacings.normal, lineHeight: hp(2.2) },
  hintOnly: { color: textMuted, lineHeight: hp(2.4) },

  clockBox: { paddingBottom: spacings.xxLarge },
  clockText: { color: accentColor },
  clockDone: { color: okColor },
  clockHint: {
    color: textMuted,
    marginTop: spacings.small,
    textAlign: 'center',
    lineHeight: hp(2.2),
  },
  doneButton: { marginTop: spacings.normalx },

  banner: {
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  bannerOk: { backgroundColor: okSoft },
  bannerOkText: { color: okColor, marginLeft: spacings.normalx, flex: 1 },

  error: {
    backgroundColor: dangerSoft,
    borderRadius: 14,
    padding: spacings.large,
    marginTop: spacings.large,
  },
  errorText: { color: dangerColor, marginLeft: spacings.normalx, flex: 1 },
});
