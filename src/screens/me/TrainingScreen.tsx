import React from 'react';
import { Placeholder } from '../Placeholder';
import { icons } from '../../components';
import { screenTitles, me } from '../../constans/Constants';

/**
 * Courses assigned to this driver, and marking one done.
 */
export function TrainingScreen() {
  return <Placeholder title={screenTitles.training} hint={me.noTraining} icon={icons.logbook} />;
}
