import React from 'react';
import { Placeholder } from '../Placeholder';
import { icons } from '../../components';
import { screenTitles, inspect } from '../../constans/Constants';

/**
 * Repairs open on trucks this driver has driven. Read-only: a driver reports a fault, the office opens the work order.
 */
export function MyRepairsScreen() {
  return <Placeholder title={screenTitles.myRepairs} hint={inspect.noWorkOrders} icon={icons.truck} />;
}
