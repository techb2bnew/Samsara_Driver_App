import React from 'react';
import { Placeholder } from '../Placeholder';
import { icons } from '../../components';
import { screenTitles, me } from '../../constans/Constants';

/**
 * Faults this driver reported, and whether a repair was raised.
 */
export function MyFaultsScreen() {
  return <Placeholder title={screenTitles.myFaults} hint={me.faults} icon={icons.warning} />;
}
