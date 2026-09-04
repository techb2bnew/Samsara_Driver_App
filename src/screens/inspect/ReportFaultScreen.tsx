import React from 'react';
import { Placeholder } from '../Placeholder';
import { icons } from '../../components';
import { screenTitles, inspect } from '../../constans/Constants';

/**
 * Reports a fault. Reachable from an inspection and on its own, because a driver should not have to fill in a whole pre-trip to say something broke mid-route.
 */
export function ReportFaultScreen() {
  return <Placeholder title={screenTitles.reportFault} hint={inspect.reportAlone} icon={icons.warning} />;
}
