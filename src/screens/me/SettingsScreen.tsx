import React from 'react';
import { Placeholder } from '../Placeholder';
import { icons } from '../../components';
import { screenTitles, me } from '../../constans/Constants';

/**
 * Preferences that belong to the driver, not to the office.
 */
export function SettingsScreen() {
  return <Placeholder title={screenTitles.settings} hint={me.settings} icon={icons.me} />;
}
