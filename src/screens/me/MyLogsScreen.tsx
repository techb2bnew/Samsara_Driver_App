import React from 'react';
import { Placeholder } from '../Placeholder';
import { icons } from '../../components';
import { screenTitles, me } from '../../constans/Constants';

/**
 * Past days, certified or not. The list a roadside inspection asks for.
 */
export function MyLogsScreen() {
  return <Placeholder title={screenTitles.myLogs} hint={me.logs} icon={icons.logbook} />;
}
