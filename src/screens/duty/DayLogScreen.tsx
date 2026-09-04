import React from 'react';
import { Placeholder } from '../Placeholder';
import { icons } from '../../components';
import { screenTitles, duty } from '../../constans/Constants';

/**
 * One past day in full, so a driver can check it before certifying or ask for a correction.
 */
export function DayLogScreen() {
  return <Placeholder title={screenTitles.dayLog} hint={duty.certifyHint} icon={icons.logbook} />;
}
