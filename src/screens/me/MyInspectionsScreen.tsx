import React from 'react';
import { Placeholder } from '../Placeholder';
import { icons } from '../../components';
import { screenTitles, me } from '../../constans/Constants';

/**
 * Inspections this driver has filed.
 */
export function MyInspectionsScreen() {
  return <Placeholder title={screenTitles.myInspections} hint={me.inspections} icon={icons.inspect} />;
}
