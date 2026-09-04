import React from 'react';
import { Placeholder } from '../Placeholder';
import { icons } from '../../components';
import { screenTitles, me } from '../../constans/Constants';

/**
 * Licence, medical certificate and the rest, with their expiry dates.
 */
export function MyDocumentsScreen() {
  return <Placeholder title={screenTitles.myDocuments} hint={me.documents} icon={icons.logbook} />;
}
