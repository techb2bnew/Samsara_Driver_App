import React from 'react';
import { Placeholder } from '../Placeholder';
import { icons } from '../../components';
import { screenTitles, inspect } from '../../constans/Constants';

/**
 * Fills in one form. The fields are rendered from the form definition, so the office can change what is asked without an app release.
 */
export function InspectionFormScreen() {
  return <Placeholder title={screenTitles.inspectionForm} hint={inspect.submit} icon={icons.inspect} />;
}
