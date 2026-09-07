import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Badge,
  Card,
  ConfirmModal,
  ListRow,
  ScreenTitle,
  icons,
} from '../../components';
import { BaseStyle } from '../../constans/Style';
import { spacings, style as fontStyle } from '../../constans/Fonts';
import {
  accentColor,
  accentSoft,
  appBg,
  dangerColor,
  onAccent,
  textDark,
  textFaint,
  textMuted,
} from '../../constans/Color';
import { me as t, modal, notifications as n, screenTitles } from '../../constans/Constants';
import { personName } from '../../helpers/names';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import { useNotifications } from '../../context/NotificationContext';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MeStackParams, TabParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MeStackParams, 'MeHome'>;

/**
 * Everything that did not earn a tab.
 *
 * Grouped rather than one long list: a driver looking for their licence expiry
 * and a driver looking for sign-out are doing different things, and a
 * fourteen-row list makes both of them read all fourteen.
 */
export function MeHomeScreen({ navigation }: Props) {
  const { state, signOut } = useAuth();
  const { vehicle } = useShift();
  const { unreadCount } = useNotifications();

  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const profile = state.status === 'signedIn' ? state.profile : null;
  const name = profile ? personName(profile.firstName, profile.lastName) : '';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={[BaseStyle.flex, styles.ground]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <ScreenTitle title={t.title} />

        {/* ------------------------------------------------------- who I am */}
        <Card>
          <View style={[BaseStyle.flexDirectionRow, BaseStyle.alignItemsCenter]}>
            <View style={[BaseStyle.alignJustifyCenter, styles.avatar]}>
              <Text
                style={[fontStyle.fontSizeLarge, fontStyle.fontWeightMedium1x, styles.initials]}>
                {initials || '—'}
              </Text>
            </View>
            <View style={BaseStyle.flex}>
              <Text
                style={[fontStyle.fontSizeNormal2x, fontStyle.fontWeightMedium, styles.name]}>
                {name || '—'}
              </Text>
              {/*
                Falls back to the fleet's name, not a dash.

                Employee number is optional and a driver may not be placed at a
                depot yet, so both halves of this line are routinely empty —
                and it was showing a bare "—" between the driver's name and
                their truck, which reads as something having failed to load.
                The organisation always has a name, and "who you drive for" is
                worth a line on a profile card.
              */}
              <Text style={[fontStyle.fontSizeSmall2x, styles.meta]}>
                {[profile?.employeeNumber, profile?.depotName].filter(Boolean).join(' · ') ||
                  profile?.orgName ||
                  ''}
              </Text>

              {/*
                And the truck says so when there isn't one. It vanished before,
                which left the card looking finished while the driver was in
                the one state that stops them going on duty.
              */}
              <Text
                style={[
                  fontStyle.fontSizeSmall2x,
                  vehicle ? styles.truck : styles.noTruck,
                ]}>
                {vehicle ? `${vehicle.name} · ${vehicle.plate}` : t.noTruck}
              </Text>
            </View>
          </View>
        </Card>

        {/* ------------------------------------------------------- history */}
        <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
          {t.history.toUpperCase()}
        </Text>
        <Card padded={false}>
          <ListRow
            icon={icons.bell}
            title={screenTitles.notifications}
            detail={unreadCount > 0 ? n.markAllRead : undefined}
            trailing={
              unreadCount > 0 ? (
                <Badge
                  label={String(unreadCount)}
                  color={onAccent}
                  background={accentColor}
                />
              ) : undefined
            }
            onPress={() => navigation.navigate('Notifications')}
          />
          <ListRow
            icon={icons.logbook}
            title={t.logs}
            onPress={() => navigation.navigate('MyLogs')}
          />
          {/*
            My inspections and My fault reports are hidden, not deleted.

            Both read the far end of a chain that starts with an inspection
            form, and there is no form to start it: the console's form builder
            is switched off, so nobody can make one, so no driver can submit an
            inspection, so no defect is ever raised from one. Two rows that can
            only ever open an empty list are worse than two rows that are not
            there — a driver taps them looking for the fault they reported last
            week and concludes the app has lost it.

            The screens, their routes and their queries are all left in place
            and still compiled, so this is a link away from coming back. Turn
            the Forms module on and put these two rows back with it.

            <ListRow
              icon={icons.inspect}
              title={t.inspections}
              onPress={() => navigation.navigate('MyInspections')}
            />
            <ListRow
              icon={icons.warning}
              title={t.faults}
              onPress={() => navigation.navigate('MyFaults')}
            />
          */}

          {/*
            My violations stays. It is the one of the three that does not
            depend on a form: it is worked out from the driver's own duty taps
            against the rule book, so it starts filling in the moment somebody
            drives.
          */}
          <ListRow
            icon={icons.alert}
            title={t.violations}
            onPress={() => navigation.navigate('MyViolations')}
            last
          />
        </Card>

        {/* --------------------------------------------------------- mine */}
        <Text style={[fontStyle.fontSizeSmall2x, fontStyle.fontWeightMedium, styles.section]}>
          {t.profile.toUpperCase()}
        </Text>
        <Card padded={false}>
          <ListRow
            icon={icons.shield}
            title={t.documents}
            onPress={() => navigation.navigate('MyDocuments')}
          />
          <ListRow
            icon={icons.logbook}
            title={t.training}
            onPress={() => navigation.navigate('Training')}
          />
          <ListRow
            icon={icons.refresh}
            title={t.correction}
            onPress={() => navigation.navigate('RequestCorrection')}
          />
          <ListRow
            icon={icons.me}
            title={t.settings}
            onPress={() => navigation.navigate('Settings')}
            last
          />
        </Card>

        {/* -------------------------------------------------------- leaving */}
        <Card padded={false} style={styles.dangerCard}>
          <ListRow
            icon={icons.signOut}
            title={t.signOut}
            tone={accentColor}
            onPress={() => setSigningOut(true)}
          />
          <ListRow
            icon={icons.close}
            title={modal.deleteAccount.title.replace('?', '')}
            tone={dangerColor}
            onPress={() => setDeleting(true)}
            last
          />
        </Card>
      </ScrollView>

      <ConfirmModal
        visible={signingOut}
        title={modal.signOut.title}
        message={modal.signOut.message}
        confirmLabel={modal.signOut.confirm}
        icon={icons.signOut}
        loading={busy}
        onConfirm={handleSignOut}
        onCancel={() => setSigningOut(false)}
      />

      {/*
        Deleting an account is not something a driver can do, and this says so
        rather than hiding the option. Their duty logs and signatures are a
        legal record the fleet has to keep, and dropping the login would orphan
        them — so the office does it, and the button asks them to.
      */}
      <ConfirmModal
        visible={deleting}
        title={modal.deleteAccount.title}
        message={modal.deleteAccount.message}
        confirmLabel={modal.deleteAccount.confirm}
        icon={icons.alert}
        tone="danger"
        /*
         * Opens the thread with the request already written.
         *
         * This closed the dialog and did nothing else, so a driver who wanted
         * their account gone tapped a button labelled "Contact my office" and
         * was returned to the same screen, none the wiser about how to.
         *
         * The message thread is the right destination rather than a phone
         * number or a mailto: — it is the channel the office already reads,
         * it needs no dialler or mail account on a work handset, and it
         * leaves a record on both sides of a request that has to be actioned
         * by a person.
         */
        onConfirm={() => {
          setDeleting(false);
          navigation.getParent<BottomTabNavigationProp<TabParams>>()?.navigate('MessagesTab', {
            screen: 'MessagesHome',
            params: { draft: modal.deleteAccount.draft },
          });
        }}
        onCancel={() => setDeleting(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: appBg },
  body: { paddingHorizontal: spacings.xxLarge, paddingBottom: spacings.ExtraLarge },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: accentSoft,
    marginRight: spacings.large,
  },
  initials: { color: accentColor },
  name: { color: textDark },
  meta: { color: textMuted, marginTop: spacings.xxsmall },
  truck: { color: accentColor, marginTop: spacings.xxsmall },
  noTruck: { color: textFaint, marginTop: spacings.xxsmall },
  section: {
    color: textMuted,
    letterSpacing: 1.1,
    marginTop: spacings.xxLarge,
    marginBottom: spacings.normalx,
  },
  dangerCard: { marginTop: spacings.xxxLarge },
});
