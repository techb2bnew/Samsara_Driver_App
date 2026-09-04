import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { AppIcon, EmptyState, ScreenTitle, icons } from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  appBg,
  borderColor,
  cardBg,
  dangerColor,
  disabledBg,
  onAccent,
  placeholderColor,
  textDark,
  textFaint,
  textMuted,
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
  /*
   * The composer is pinned above the keyboard, and the keyboard's height is
   * measured from the bottom of the SCREEN — not from the bottom of this
   * screen, which sits above the tab bar. Without this offset the composer
   * ends up hidden behind the keyboard by exactly the height of the tab bar.
   */
  const tabBarHeight = useBottomTabBarHeight();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
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
        <ScreenTitle title={t.title} />
      </View>

      <KeyboardAvoidingView
        style={BaseStyle.flex}
        // Android resizes the window itself (adjustResize in the manifest), so
        // adding padding there would double-count and push the thread up.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight : 0}>
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
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const mine = item.direction === 'from_driver';
              return (
                <View
                  style={[
                    styles.bubbleWrap,
                    mine ? BaseStyle.alignSelfEnd : BaseStyle.alignSelfStart,
                  ]}>
                  <View
                    style={[
                      BaseStyle.borderRadius10,
                      styles.bubble,
                      mine ? styles.mine : styles.theirs,
                    ]}>
                    <Text
                      style={[
                        fontStyle.fontSizeNormal1x,
                        mine ? styles.mineText : styles.theirsText,
                      ]}>
                      {item.body}
                    </Text>
                  </View>
                  <Text
                    style={[
                      fontStyle.fontSizeExtraSmall,
                      styles.time,
                      mine ? BaseStyle.alignSelfEnd : BaseStyle.alignSelfStart,
                    ]}>
                    {timeOf(item.sentAt)}
                  </Text>
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

        <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter, styles.composer]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t.placeholder}
            placeholderTextColor={placeholderColor}
            multiline
            style={[BaseStyle.flex, fontStyle.fontSizeNormal1x, styles.input]}
          />
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
              <AppIcon name={icons.send} size={18} color={onAccent} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  head: { paddingHorizontal: spacings.xxLarge },
  list: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.large },

  bubbleWrap: { maxWidth: wp(78), marginBottom: spacings.large },
  bubble: { paddingVertical: spacings.large, paddingHorizontal: spacings.large },
  mine: { backgroundColor: accentColor, borderBottomRightRadius: 3 },
  theirs: {
    backgroundColor: cardBg,
    borderWidth: 1,
    borderColor,
    borderBottomLeftRadius: 3,
  },
  mineText: { color: onAccent, lineHeight: hp(2.7) },
  theirsText: { color: textDark, lineHeight: hp(2.7) },
  time: { color: textFaint, marginTop: spacings.xsmall },

  error: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.normalx },
  errorText: { color: dangerColor, marginLeft: spacings.normal, flex: 1 },

  composer: {
    paddingHorizontal: spacings.large,
    paddingVertical: spacings.normalx,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: borderColor,
    backgroundColor: cardBg,
  },
  input: {
    color: textDark,
    maxHeight: hp(14),
    paddingVertical: spacings.large,
    paddingHorizontal: spacings.normalx,
  },
  sendButton: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: accentColor,
    marginLeft: spacings.normalx,
  },
  sendDisabled: { backgroundColor: disabledBg },
  errorRow: { color: textMuted },
});
