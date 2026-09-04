import React from 'react';
import { Placeholder } from '../Placeholder';
import { icons } from '../../components';
import { screenTitles, violations } from '../../constans/Constants';

/**
 * Hours violations against this driver, worked out from the duty events rather than stored.
 */
export function MyViolationsScreen() {
  return <Placeholder title={screenTitles.myViolations} hint={violations.emptyHint} icon={icons.alert} />;
}
