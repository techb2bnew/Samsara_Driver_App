import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { AppIcon, EmptyState, icons } from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  accentSoft,
  appBg,
  borderColor,
  cardBg,
  cardBgSoft,
  dangerColor,
  disabledBg,
  onAccent,
  placeholderColor,
  shadowColor,
  textDark,
  textFaint,
} from '../../constans/Color';
import { messages as t } from '../../constans/Constants';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../../utils';
import * as api from '../../supabase/api';
import type { Message } from '../../supabase/api';
import { useAuth } from '../../context/AuthContext';

/** "14:35" — a message from today needs no date. */
function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * How far the composer must rise so it sits on the keyboard, not in it.
 *
 * iOS: keyboard height is from the bottom of the screen, and this screen
 * already sits on the tab bar — the lift is the difference.
 *
 * Android is edge-to-edge: the IME height does not include the nav bar, but
 * `tabBarHeight` does. Subtracting the nav bar twice left the field half
 * behind the keyboard, so Android only subtracts the tab bar's own height.
 */
function useComposerLift(tabBarHeight: number, bottomInset: number): number {
  const [lift, setLift] = useState(0);

  useEffect(() => {
    const covered =
      Platform.OS === 'android' ? Math.max(0, tabBarHeight - bottomInset) : tabBarHeight;

    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      event => {
        setLift(Math.max(0, event.endCoordinates.height - covered));
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setLift(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [tabBarHeight, bottomInset]);

  return lift;
}

/**
 * The thread with the fleet office.
 *
 * Inverted list, which is how every chat works: new messages arrive at the
 * bottom and the list must already be scrolled there. Rendering it upright and
 * scrolling to the end after each load fights the keyboard and jumps.
 *
 * Read receipts are sent once when the screen opens, not per message. The
 * office needs to know the driver has seen the thread; which individual line
 * they looked at is not a useful fact and would be a write per row.
 *
 * ---------------------------------------------------------------------------
 * Two ways this stays current, and both are needed
 * ---------------------------------------------------------------------------
 * A realtime subscription pushes new messages and read receipts as they land.
 * That is the one that matters — a driver at a gate reading "call the office"
 * should not have to pull to refresh.
 *
 * But a socket drops: a truck goes through a tunnel, the phone sleeps, the OS
 * suspends the app in a cradle. So the thread is also re-read whenever the tab
 * regains focus. Without that, the ONE place a tab navigator never re-runs an
 * effect — switching away and back does not remount — is exactly where a
 * stale thread would sit unnoticed.
 */
export function MessagesHomeScreen() {
  const { state } = useAuth();
  const profile = state.status === 'signedIn' ? state.profile : null;

  const [thread, setThread] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const lift = useComposerLift(tabBarHeight, bottomInset);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [focused, setFocused] = useState(false);
  const marked = useRef(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    try {
      const rows = await api.loadMessages(profile.driverId);
      setThread(rows);

      if (!marked.current && rows.some(m => m.direction === 'to_driver' && !m.readAt)) {
        marked.current = true;
        // Not awaited: a read receipt is not worth making the driver wait, and
        // a failure leaves it unread, which is the safe direction.
        api.markMessagesRead(profile.driverId).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  /*
   * Live updates. Torn down when the screen unmounts so a signed-out driver
   * does not leave a socket open on someone else's thread.
   */
  useEffect(() => {
    if (!profile) return;
    return api.onMessagesChanged(profile.driverId, () => {
      load();
    });
  }, [profile, load]);

  // The safety net for a dropped socket. A tab navigator keeps its screens
  // mounted, so this is the only thing that runs when the driver comes back.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function send() {
    const body = draft.trim();
    if (!body || !profile) return;

    setSending(true);
    setError(null);
    try {
      await api.sendMessage(profile.orgId, profile.driverId, body);
      setDraft('');
      await load();
    } catch {
      setError(t.failed);
    } finally {
      setSending(false);
    }
  }

  // Newest first, because the list is inverted.
  const data = [...thread].reverse();

  return (
    <SafeAreaView style={[BaseStyle.flex, styles.ground]} edges={['top']}>
      <View style={styles.head}>
        <View style={[BaseStyle.alignJustifyCenter, styles.officeMark]}>
          <AppIcon name={icons.messages} size={18} color={accentColor} />
        </View>
        <View style={BaseStyle.flex}>
          <Text style={[fontStyle.fontSizeSmall2x, styles.eyebrow]}>{t.title.toUpperCase()}</Text>
          <Text style={[fontStyle.fontSizeLargeX, fontStyle.fontWeightMedium1x, styles.office]}>
            {t.office}
          </Text>
        </View>
      </View>

      <View style={[BaseStyle.flex, { paddingBottom: lift }]}>
        {loading ? (
          <View style={[BaseStyle.flex, BaseStyle.alignJustifyCenter]}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : data.length === 0 ? (
          <View style={BaseStyle.flex}>
            <EmptyState icon={icons.messages} title={t.empty} hint={t.emptyHint} />
          </View>
        ) : (
          <FlatList
            data={data}
            inverted
            keyExtractor={m => m.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const mine = item.direction === 'from_driver';
              const previous = data[index - 1];
              const clustered =
                previous !== undefined && previous.direction === item.direction;
              return (
                <View
                  style={[
                    mine ? BaseStyle.alignSelfEnd : BaseStyle.alignSelfStart,
                    styles.bubbleWrap,
                    clustered && styles.clustered,
                  ]}>
                  <View style={[BaseStyle.flexDirectionRow, styles.bubbleRow]}>
                    {!mine && (
                      <View
                        style={[
                          BaseStyle.alignJustifyCenter,
                          styles.avatar,
                          clustered && styles.avatarHidden,
                        ]}>
                        <AppIcon name={icons.messages} size={14} color={accentColor} />
                      </View>
                    )}
                    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                      <Text
                        style={[
                          fontStyle.fontSizeNormal1x,
                          mine ? styles.mineText : styles.theirsText,
                        ]}>
                        {item.body}
                      </Text>
                    </View>
                  </View>
                  {!clustered && (
                    <Text
                      style={[
                        fontStyle.fontSizeExtraSmall,
                        styles.time,
                        mine ? styles.timeMine : styles.timeTheirs,
                      ]}>
                      {timeOf(item.sentAt)}
                    </Text>
                  )}
                </View>
              );
            }}
          />
        )}

        {Boolean(error) && (
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.error]}>
            <AppIcon name={icons.alert} size={16} color={dangerColor} />
            <Text style={[fontStyle.fontSizeSmall2x, styles.errorText]}>{error}</Text>
          </View>
        )}

        <View
          style={[
            BaseStyle.flexDirectionRow,
            BaseStyle.alignItemsFlexEnd,
            styles.composer,
            lift > 0 && styles.composerRaised,
          ]}>
          <View
            style={[
              BaseStyle.flex,
              BaseStyle.flexDirectionRow,
              BaseStyle.alignItemsCenter,
              styles.field,
              focused && styles.fieldFocus,
            ]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t.placeholder}
              placeholderTextColor={placeholderColor}
              multiline
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={[
                BaseStyle.flex,
                fontStyle.fontSizeNormal1x,
                styles.input,
                Platform.OS === 'android' ? styles.inputAndroid : null,
              ]}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.send}
            disabled={!draft.trim() || sending}
            onPress={send}
            style={[
              BaseStyle.alignJustifyCenter,
              styles.sendButton,
              (!draft.trim() || sending) && styles.sendDisabled,
            ]}>
            {sending ? (
              <ActivityIndicator color={onAccent} size="small" />
            ) : (
              <AppIcon name={icons.send} size={16} color={onAccent} />
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacings.xxLarge,
    paddingTop: spacings.xxLarge,
    paddingBottom: spacings.large,
  },
  officeMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: accentSoft,
    marginRight: spacings.large,
  },
  eyebrow: { color: textFaint, letterSpacing: 1.2 },
  office: { color: textDark, marginTop: spacings.xxsmall },
  list: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.large },

  bubbleWrap: {
    maxWidth: wp(78),
    marginBottom: spacings.large,
  },
  clustered: { marginBottom: spacings.small },
  bubbleRow: { alignItems: 'flex-end' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: accentSoft,
    marginRight: spacings.normal,
  },
  avatarHidden: { opacity: 0 },
  bubble: {
    maxWidth: wp(70),
    paddingVertical: spacings.large,
    paddingHorizontal: spacings.xLarge,
    borderRadius: 18,
  },
  mine: { backgroundColor: accentColor, borderBottomRightRadius: 6 },
  theirs: {
    backgroundColor: cardBg,
    borderBottomLeftRadius: 6,
    shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  mineText: { color: onAccent, lineHeight: hp(2.7) },
  theirsText: { color: textDark, lineHeight: hp(2.7) },
  time: { color: textFaint, marginTop: spacings.xsmall },
  timeMine: { alignSelf: 'flex-end' },
  timeTheirs: { marginLeft: 36 },

  error: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.normalx },
  errorText: { color: dangerColor, marginLeft: spacings.normal, flex: 1 },

  composer: {
    paddingHorizontal: spacings.xxLarge,
    paddingTop: spacings.large,
    paddingBottom: spacings.large,
    backgroundColor: appBg,
  },
  composerRaised: { paddingBottom: spacings.normal },
  field: {
    minHeight: hp(5.6),
    maxHeight: hp(14),
    backgroundColor: cardBgSoft,
    borderWidth: 1.5,
    borderColor,
    borderRadius: 14,
    paddingHorizontal: spacings.large,
    marginRight: spacings.normalx,
  },
  fieldFocus: {
    backgroundColor: cardBg,
    borderColor: accentColor,
  },
  input: {
    color: textDark,
    paddingVertical: spacings.normalx,
    margin: 0,
  },
  inputAndroid: { textAlignVertical: 'center' },
  sendButton: {
    width: hp(5.6),
    height: hp(5.6),
    borderRadius: 14,
    backgroundColor: accentColor,
  },
  sendDisabled: { backgroundColor: disabledBg },
});
