import React from 'react';
import { Placeholder } from '../Placeholder';
import { icons } from '../../components';
import { screenTitles, routeScreen } from '../../constans/Constants';

/**
 * One stop: arrive, and attach the paperwork that came back from it.
 */
export function StopDetailScreen() {
  return <Placeholder title={screenTitles.stopDetail} hint={routeScreen.markArrived} icon={icons.pin} />;
}
