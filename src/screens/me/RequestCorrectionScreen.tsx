import React from 'react';
import { Placeholder } from '../Placeholder';
import { icons } from '../../components';
import { screenTitles, correction } from '../../constans/Constants';

/**
 * Asks the office to change a log entry. Written as a new append-only row pointing at the one it would replace.
 */
export function RequestCorrectionScreen() {
  return <Placeholder title={screenTitles.requestCorrection} hint={correction.subtitle} icon={icons.logbook} />;
}
