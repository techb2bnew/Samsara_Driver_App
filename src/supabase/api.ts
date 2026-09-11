/**
 * Every call this app makes to Supabase.
 *
 * One file, by decision. A screen never builds a query — it calls a function
 * from here and gets a plain object back. Three reasons that matters more on
 * the phone than it would in the console:
 *
 *   1. Row-level security decides what a driver can see, and the shape of each
 *      query has to match those policies. Keeping them together means one
 *      place to check against the schema when a policy changes.
 *   2. Almost everything here has to survive being offline. The queue wraps
 *      these functions, so they all have to be plain and retryable.
 *   3. The screens then hold no knowledge of the database at all, which is
 *      what makes them cheap to redesign.
 *
 * Nothing here formats for display. Dates come back as ISO strings and
 * minutes as numbers; the screens decide how to word them.
 */

import { supabase } from './client';
import type { Json } from './database';
import { displayName } from '../helpers/names';
import { base64ToBytes } from '../helpers/base64';
import {
  limitsFor,
  limitsFromRuleBook,
  regulatorFrom,
  type Limits,
  type RuleBookRow,
} from '../helpers/hosLimits';

/* ========================================================================
   Who am I
   ======================================================================== */

export type DriverProfile = {
  driverId: string;
  orgId: string;
  orgName: string;
  /** IANA zone. The legal working day is cut in this timezone. */
  timezone: string;
  /** FMCSA, EU, or null when the office has not chosen a rule book. */
  regulator: string | null;
  /*
   * The limits actually in force, whichever kind of rule book they came from.
   *
   * Resolved here rather than on each screen, because there are now two places
   * they can come from — a built-in regime, or a rule book the fleet wrote for
   * itself — and three screens working that out separately is three chances to
   * disagree about what a driver's day is allowed to be.
   *
   * Null when the office has chosen nothing, which is what puts a dash on
   * every clock.
   */
  limits: Limits | null;
  /*
   * Set only when the fleet is on its own rule book, and shown to the driver.
   *
   * Deliberate: hand-typed limits must never look like the law. A driver
   * reading "9h30 left" is entitled to know whether that came from a
   * regulation or from their office's own policy.
   */
  ruleBookName: string | null;
  firstName: string;
  lastName: string;
  employeeNumber: string | null;
  depotId: string | null;
  depotName: string | null;
};

/**
 * The signed-in driver's own record.
 *
 * Returns null when the account exists but is not linked to a driver — an
 * office login on the driver app, or an invitation that half-finished. The
 * sign-in screen says so rather than dropping them into an empty app.
 */
export async function loadProfile(): Promise<DriverProfile | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('drivers')
    .select('id, org_id, first_name, last_name, employee_number, fleet_id, timezone')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  /*
   * Two more reads rather than an embed. A driver's policy on organizations
   * and fleets is a separate one from the policy on drivers, and PostgREST
   * embeds silently return null when the embedded row is not readable — which
   * would look like an organisation with no name.
   */
  const [org, depot] = await Promise.all([
    supabase
      .from('organizations')
      .select('name, timezone, hos_regulator, hos_rule_book_id')
      .eq('id', data.org_id)
      .maybeSingle(),
    data.fleet_id
      ? supabase.from('fleets').select('name').eq('id', data.fleet_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (org.error) throw new Error(org.error.message);

  /*
   * A third read, and only when there is something to read. A custom rule book
   * is the exception rather than the rule, so this costs nothing for the fleets
   * on FMCSA or the EU regulation.
   */
  let custom: RuleBookRow | null = null;
  let customName: string | null = null;
  if (org.data?.hos_rule_book_id) {
    const book = await supabase
      .from('hos_rule_books')
      .select(
        'name, daily_driving_minutes, duty_window_minutes, driving_before_break_minutes, break_length_minutes, cycle_minutes, cycle_days, daily_rest_minutes, min_work_before_break_minutes, max_break_minutes, max_on_duty_minutes',
      )
      .eq('id', org.data.hos_rule_book_id)
      .maybeSingle();
    if (book.error) throw new Error(book.error.message);
    if (book.data) {
      custom = book.data;
      customName = book.data.name;
    }
  }

  const builtIn = regulatorFrom(org.data?.hos_regulator ?? null);

  return {
    driverId: data.id,
    orgId: data.org_id,
    orgName: org.data?.name ?? '',
    // The driver's own timezone wins; it is copied from their depot when the
    // office creates them, and can be overridden for a secondment.
    timezone: data.timezone || org.data?.timezone || 'UTC',
    regulator: org.data?.hos_regulator ?? null,
    /* A custom book wins. The two columns are mutually exclusive by
       construction in the console, so this only decides what happens to any
       row written before that was true. */
    limits: custom ? limitsFromRuleBook(custom) : builtIn ? limitsFor(builtIn) : null,
    ruleBookName: customName,
    firstName: data.first_name,
    lastName: data.last_name,
    employeeNumber: data.employee_number,
    depotId: data.fleet_id,
    // Same treatment as a person's name: typed once, read every shift.
    depotName: displayName((depot.data as { name: string } | null)?.name) || null,
  };
}

/* ========================================================================
   Signing in
   ======================================================================== */

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Starts a password reset: emails a 6-digit code.
 *
 * NOTE: the code only reaches the driver if the project's "Reset password"
 * email template includes {{ .Token }}. Supabase ships that template with a
 * link and no code, so a fresh project sends an email with nothing to type in.
 */
export async function sendResetCode(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
  if (error) throw new Error(error.message);
}

/**
 * Exchanges the code for a session, so the password can then be changed.
 *
 * `type: 'recovery'` — this is a reset, not a sign-in. Using 'email' here
 * would work on some projects and fail on others depending on which flow sent
 * the code, and the difference is invisible until it breaks.
 */
export async function verifyResetCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: 'recovery',
  });
  if (error) throw new Error(error.message);
}

export async function setPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

/* ========================================================================
   The truck
   ======================================================================== */

export type VehicleOption = {
  /** Another driver is signed on to it right now. */
  inUse?: boolean;
  id: string;
  name: string;
  plate: string;
  makeModel: string;
  odometerKm: number;
};

/**
 * The trucks this driver may sign on to.
 *
 * Row-level security already narrows this to their depot plus anything they are
 * already assigned to, so the query does not repeat that rule — see the
 * driver_app_reads migration. Trailers are excluded here: a trailer is towed,
 * not signed on to.
 */
/**
 * The trucks a driver can pick from, and which of them are already taken.
 *
 * The taken list comes from an RPC, not from the table. dva_select_self
 * returns the driver's own assignments and nothing else, so read straight from
 * here every truck in the depot looks free — including the one a colleague is
 * sitting in. The driver found out by picking it and getting a unique-key
 * error from Postgres.
 *
 * Ids only, never who is on them: which truck is unavailable is a fact about
 * the truck, and a live list of where every colleague is would be something
 * else entirely.
 */
export async function loadVehicleOptions(): Promise<VehicleOption[]> {
  const [vehicles, taken] = await Promise.all([
    supabase
      .from('vehicles')
      .select('id, name, plate, make, model, odometer_km')
      .eq('kind', 'truck')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('name', { ascending: true, nullsFirst: false }),
    supabase.rpc('taken_vehicle_ids'),
  ]);

  if (vehicles.error) throw new Error(vehicles.error.message);
  /*
   * A failure here is not fatal. Without the list every truck shows as free,
   * which is exactly how this behaved before — and sign_on_to_vehicle refuses
   * a taken truck anyway. Better a picker with no badges than no picker.
   */
  const busy = new Set<string>(
    taken.error ? [] : ((taken.data as unknown as string[] | null) ?? []),
  );

  return (vehicles.data ?? []).map((v) => ({
    id: v.id,
    name: v.name?.trim() || v.plate,
    plate: v.plate,
    makeModel: [v.make, v.model].filter(Boolean).join(' ').trim(),
    odometerKm: Number(v.odometer_km ?? 0),
    inUse: busy.has(v.id),
  }));
}

/** The truck they are on right now, or null before they have picked one. */
export async function loadCurrentVehicle(
  driverId: string,
): Promise<{ assignmentId: string; vehicleId: string; name: string; plate: string } | null> {
  const { data, error } = await supabase
    .from('driver_vehicle_assignments')
    .select('id, vehicle_id, vehicles!driver_vehicle_assignments_vehicle_id_fkey(name, plate)')
    .eq('driver_id', driverId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const vehicle = data.vehicles as { name: string | null; plate: string } | null;
  return {
    assignmentId: data.id,
    vehicleId: data.vehicle_id,
    name: vehicle?.name?.trim() || vehicle?.plate || '',
    plate: vehicle?.plate ?? '',
  };
}

/**
 * Signs on to a truck at the start of a shift.
 *
 * The previous assignment is closed rather than deleted: an inspector asking
 * who was driving a truck last Tuesday needs an answer, and a driver moving
 * between trucks must not be listed against both.
 */
/**
 * Puts this driver on a truck.
 *
 * One RPC, which is one transaction. This used to be two statements — close
 * the current assignment, insert the new one — and when the insert hit
 * dva_active_vehicle_idx because a colleague was already on that truck, the
 * close had already committed. The driver was left on nothing, holding a
 * message about a duplicate key.
 *
 * The org and driver are not passed: the function reads them from the session,
 * which is the only version of them that cannot be tampered with.
 */
export async function signOnToVehicle(vehicleId: string): Promise<void> {
  const { error } = await supabase.rpc('sign_on_to_vehicle', { p_vehicle_id: vehicleId });
  // The function raises sentences, not constraint names, so this is showable.
  if (error) throw new Error(error.message);
}

/* ========================================================================
   Where I am
   ======================================================================== */

export type PositionReading = {
  latitude: number;
  longitude: number;
  speedKph?: number | null;
  headingDeg?: number | null;
  ignitionOn?: boolean | null;
  /** When the reading was TAKEN, not when it is being sent. */
  reportedAt: string;
};

/**
 * Sends one position.
 *
 * `reportedAt` is not optional in practice even though the function allows it.
 * The database drops any reading older than the one it already holds, and that
 * is the only thing stopping a replayed offline queue from parking the truck
 * on the map wherever it lost signal. Leave it out and every queued reading
 * arrives stamped "now".
 *
 * Returns the vehicle id, or null when the driver has no truck signed on —
 * which is a prompt to pick one, not a network failure to retry.
 */
export async function reportPosition(reading: PositionReading): Promise<string | null> {
  const { data, error } = await supabase.rpc('report_position', {
    latitude: reading.latitude,
    longitude: reading.longitude,
    speed_kph: reading.speedKph ?? undefined,
    heading_deg: reading.headingDeg ?? undefined,
    ignition_on: reading.ignitionOn ?? undefined,
    reported_at: reading.reportedAt,
  });

  if (error) throw new Error(error.message);
  return data ?? null;
}

/* ========================================================================
   Duty status and the day's log
   ======================================================================== */

export type DutyStatus =
  | 'off_duty'
  | 'sleeper_berth'
  | 'driving'
  | 'on_duty_not_driving'
  | 'personal_conveyance'
  | 'yard_move';

export type DutyEvent = {
  id: string;
  /**
   * The status the day should be drawn with.
   *
   * Not always what the original row says: an accepted correction replaces it.
   * The original row is never modified — the table is append-only, and the
   * whole point of a correction is that both versions survive for an auditor.
   */
  status: DutyStatus;
  startedAt: string;
  vehicleId: string | null;
  /**
   * A correction the driver asked for on this row, and where it got to.
   *
   * 'pending' — the office has not decided. The day is unchanged.
   * 'rejected' — the office said no. The day is unchanged, and the driver
   *              needs to be told rather than left wondering.
   * null — nothing outstanding, either because nothing was asked or because
   *        it was accepted and is already reflected in `status`.
   */
  correction: 'pending' | 'rejected' | null;
};

/**
 * Records a duty status change.
 *
 * `startedAt` is when the driver actually changed status, which is why it is a
 * parameter. The table is append-only and stores no end time — a status runs
 * until the next event — so a queued event sent an hour late is still
 * correct as long as its own start time is right.
 */
export async function recordDutyEvent(
  orgId: string,
  driverId: string,
  status: DutyStatus,
  startedAt: string,
  vehicleId: string | null,
  position?: { latitude: number; longitude: number } | null,
): Promise<void> {
  const { error } = await supabase.from('duty_status_events').insert({
    org_id: orgId,
    driver_id: driverId,
    vehicle_id: vehicleId,
    status,
    started_at: startedAt,
    source: 'manual',
    latitude: position?.latitude ?? null,
    longitude: position?.longitude ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Duty events between two dates, oldest first. Originals only. */
export async function loadDutyEvents(
  driverId: string,
  fromIso: string,
  toIso: string,
): Promise<DutyEvent[]> {
  const { data, error } = await supabase
    .from('duty_status_events')
    .select('id, status, started_at, vehicle_id, edit_of_id, edit_status, created_at')
    .eq('driver_id', driverId)
    .gte('started_at', fromIso)
    .lte('started_at', toIso)
    .order('started_at', { ascending: true });

  if (error) throw new Error(error.message);

  const rows = data ?? [];

  /*
   * Corrections, grouped by the row they argue with.
   *
   * This used to drop every row with an edit_of_id and stop there, with a
   * comment saying a correction "is not part of the day until it is accepted".
   * The filter never checked whether it HAD been accepted — so the office
   * approving a request changed precisely nothing: not the graph, not the
   * totals, and the driver was never told either way.
   *
   * Newest first within each group, because a driver who asked twice meant the
   * second one.
   */
  const edits = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.edit_of_id) continue;
    const group = edits.get(row.edit_of_id) ?? [];
    group.push(row);
    edits.set(row.edit_of_id, group);
  }
  for (const group of edits.values()) {
    group.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  return rows
    .filter((e) => e.edit_of_id === null)
    .map((e) => {
      const group = edits.get(e.id) ?? [];
      const accepted = group.find((x) => x.edit_status === 'accepted');
      const pending = group.find((x) => x.edit_status === 'pending');
      const rejected = group.find((x) => x.edit_status === 'rejected');

      return {
        id: e.id,
        /*
         * An accepted correction wins. The original row is left untouched in
         * the table; only what the driver is shown changes, which is the
         * difference between correcting a log and rewriting one.
         */
        status: accepted ? accepted.status : e.status,
        startedAt: e.started_at,
        vehicleId: e.vehicle_id,
        /*
         * Pending outranks rejected. A driver who was refused and asked again
         * is waiting on the second answer, not still being told about the
         * first.
         */
        correction: pending ? ('pending' as const) : rejected ? ('rejected' as const) : null,
      };
    });
}

/**
 * Signs off on a day's log.
 *
 * `certified_count` goes up rather than being set to 1: a driver who accepts a
 * correction re-certifies the day, and how many times a log was signed is part
 * of what an audit reads.
 */
export async function certifyDay(
  orgId: string,
  driverId: string,
  logDate: string,
): Promise<void> {
  const existing = await supabase
    .from('hos_daily_logs')
    .select('id, certified_count')
    .eq('driver_id', driverId)
    .eq('log_date', logDate)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);

  const now = new Date().toISOString();

  if (existing.data) {
    const { error } = await supabase
      .from('hos_daily_logs')
      .update({ certified_at: now, certified_count: (existing.data.certified_count ?? 0) + 1 })
      .eq('id', existing.data.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from('hos_daily_logs').insert({
    org_id: orgId,
    driver_id: driverId,
    log_date: logDate,
    certified_at: now,
    certified_count: 1,
  });
  if (error) throw new Error(error.message);
}

export async function loadDailyLogs(
  driverId: string,
  fromDate: string,
  toDate: string,
): Promise<Array<{ logDate: string; certifiedAt: string | null }>> {
  const { data, error } = await supabase
    .from('hos_daily_logs')
    .select('log_date, certified_at')
    .eq('driver_id', driverId)
    .gte('log_date', fromDate)
    .lte('log_date', toDate)
    .order('log_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ logDate: r.log_date, certifiedAt: r.certified_at }));
}

/**
 * Asks the office to change a log entry.
 *
 * Written as a new append-only row pointing at the one it would replace, not
 * as an edit. `source: 'manual'` marks it as the driver's own request — the
 * office may decide those. A row the OFFICE proposes carries 'carrier_edit'
 * and only the driver may decide it, which is an FMCSA rule enforced in the
 * database rather than here.
 */
export async function requestCorrection(
  orgId: string,
  driverId: string,
  originalEventId: string,
  status: DutyStatus,
  startedAt: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.from('duty_status_events').insert({
    org_id: orgId,
    driver_id: driverId,
    status,
    started_at: startedAt,
    source: 'manual',
    edit_of_id: originalEventId,
    edit_status: 'pending',
    edit_reason: reason.trim(),
  });
  if (error) throw new Error(error.message);
}

/* ========================================================================
   The route
   ======================================================================== */

export type RouteStop = {
  id: string;
  sequence: number;
  name: string;
  address: string | null;
  windowStartAt: string | null;
  windowEndAt: string | null;
  arrivedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  /**
   * Metres between the driver and the stop when they marked it arrived.
   *
   * Null means the arrival was recorded without a position check — no fix, or
   * a stop the office gave no coordinates. Not the same as zero.
   */
  arrivedDistanceM: number | null;
};

export type AssignedRoute = {
  id: string;
  reference: string;
  status: string;
  plannedStartAt: string | null;
  notes: string | null;
  /**
   * The planned drive, as points the map draws a line through.
   *
   * Stored as "lat,lng|lat,lng" rather than an encoded Google polyline: the
   * office plans the route and this app only draws it, so a format both sides
   * can read without a library is worth more than the bytes saved.
   *
   * Empty when the office planned without a road path. The stops still carry
   * coordinates, so the map joins them in a straight line instead.
   */
  path: LatLng[];
  plannedDistanceKm: number | null;
  stops: RouteStop[];
};

export type LatLng = { latitude: number; longitude: number };

/** "18.52,73.85|18.60,73.90" into points. A bad pair is dropped, not guessed. */
export function parsePath(value: string | null): LatLng[] {
  if (!value) return [];
  return value
    .split('|')
    .map(part => {
      const [lat, lng] = part.split(',').map(Number);
      return { latitude: lat, longitude: lng };
    })
    .filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
}

/** The driver's own active route. RLS already limits this to theirs. */
export async function loadMyRoute(driverId: string): Promise<AssignedRoute | null> {
  const { data, error } = await supabase
    .from('routes')
    .select(
      `
      id, reference, status, planned_start_at, notes, path_polyline, planned_distance_km,
      route_stops (
        id, sequence, name, address, window_start_at, window_end_at, arrived_at, latitude, longitude,
        arrived_distance_m
      )
    `,
    )
    .eq('driver_id', driverId)
    .in('status', ['planned', 'dispatched', 'in_progress'])
    .is('deleted_at', null)
    .order('planned_start_at', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const stops = [...((data as { route_stops?: Array<Record<string, unknown>> }).route_stops ?? [])].sort(
    (a, b) => Number(a.sequence) - Number(b.sequence),
  );

  return {
    id: data.id,
    reference: data.reference ?? '',
    status: data.status,
    plannedStartAt: data.planned_start_at,
    notes: data.notes,
    path: parsePath(data.path_polyline),
    plannedDistanceKm:
      data.planned_distance_km === null ? null : Number(data.planned_distance_km),
    stops: stops.map(s => ({
      id: s.id as string,
      sequence: s.sequence as number,
      name: s.name as string,
      address: (s.address as string | null) ?? null,
      windowStartAt: (s.window_start_at as string | null) ?? null,
      windowEndAt: (s.window_end_at as string | null) ?? null,
      arrivedAt: (s.arrived_at as string | null) ?? null,
      latitude: s.latitude === null || s.latitude === undefined ? null : Number(s.latitude),
      longitude: s.longitude === null || s.longitude === undefined ? null : Number(s.longitude),
      arrivedDistanceM:
        s.arrived_distance_m === null || s.arrived_distance_m === undefined
          ? null
          : Number(s.arrived_distance_m),
    })),
  };
}

/**
 * Marks a stop reached.
 *
 * `arrivedAt` is a parameter for the same reason as everywhere else: the driver
 * may tap this in a dead zone, and the time they arrived is not the time the
 * write finally lands.
 */
/**
 * Marks a stop arrived, with where the driver was when they did it.
 *
 * The position is optional because it has to be. A lorry parked between two
 * warehouses often has no fix, and a driver standing at the right gate with a
 * phone that cannot see the sky still has to be able to work. Sending null
 * records the arrival as unverified, which is a more useful thing to hand a
 * dispatcher than a driver locked out of their own route.
 *
 * `arrivedAt` is the moment the driver tapped, not the moment this lands —
 * same as every other write in this app, for the same reason.
 */
export async function markStopArrived(
  stopId: string,
  arrivedAt: string,
  at?: { latitude: number; longitude: number; distanceM: number } | null,
): Promise<void> {
  const { error } = await supabase
    .from('route_stops')
    .update({
      arrived_at: arrivedAt,
      /*
       * All three together or all three null — the table's own constraint
       * refuses half a coordinate, because a lone latitude plots itself on the
       * Greenwich meridian rather than failing.
       */
      arrived_latitude: at?.latitude ?? null,
      arrived_longitude: at?.longitude ?? null,
      arrived_distance_m: at?.distanceM ?? null,
    })
    .eq('id', stopId);
  if (error) throw new Error(error.message);
}

export async function setRouteStatus(
  routeId: string,
  status: 'in_progress' | 'completed',
): Promise<void> {
  const { error } = await supabase
    .from('routes')
    .update({
      status,
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', routeId);
  if (error) throw new Error(error.message);
}

/* ========================================================================
   Inspections and faults
   ======================================================================== */

export type FormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
};

export type InspectionForm = {
  id: string;
  key: string;
  version: number;
  name: string;
  fields: FormField[];
};

/**
 * The forms this driver has to fill in.
 *
 * The newest published version of each key, because a form is versioned and
 * only the current one should be filled in. RLS returns every published
 * version the driver may see; picking the newest is a query concern, not a
 * policy one.
 */
export async function loadForms(): Promise<InspectionForm[]> {
  const { data, error } = await supabase
    .from('forms')
    .select('id, key, version, name, fields')
    .is('deleted_at', null)
    .order('version', { ascending: false });

  if (error) throw new Error(error.message);

  const newest = new Map<string, InspectionForm>();
  for (const row of data ?? []) {
    if (newest.has(row.key)) continue;
    newest.set(row.key, {
      id: row.id,
      key: row.key,
      version: row.version,
      name: row.name,
      fields: (row.fields as FormField[]) ?? [],
    });
  }
  return [...newest.values()];
}

export type DefectInput = {
  area: string;
  finding: string;
  severity: 'minor' | 'major' | 'out_of_service';
};

/**
 * Files an inspection, and any faults it found.
 *
 * The submission goes in first so the defects can point at it. A defect with
 * no submission is also valid — see reportDefect — which is how a driver
 * reports something mid-route without filling in a whole form.
 */
export async function submitInspection(
  orgId: string,
  driverId: string,
  vehicleId: string,
  formId: string,
  answers: Json,
  defects: DefectInput[],
): Promise<string> {
  const { data, error } = await supabase
    .from('form_submissions')
    .insert({
      org_id: orgId,
      driver_id: driverId,
      vehicle_id: vehicleId,
      form_id: formId,
      answers,
      submitted_at: new Date().toISOString(),
      /*
       * Always 'submitted'. Whether an inspection has an open defect is worked
       * out from the defects themselves — the console derives it on read, so
       * storing it here would be a second answer that can disagree.
       */
      status: 'submitted',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  if (defects.length > 0) {
    const rows = await supabase.from('defects').insert(
      defects.map((d) => ({
        org_id: orgId,
        vehicle_id: vehicleId,
        submission_id: data.id,
        reported_by_driver: driverId,
        area: d.area.trim(),
        finding: d.finding.trim(),
        severity: d.severity,
        status: 'open' as const,
      })),
    );
    // The inspection is filed either way. Losing the faults silently would be
    // the worst outcome here, so it is reported separately.
    if (rows.error) {
      throw new Error(`Inspection sent, but the faults were not: ${rows.error.message}`);
    }
  }

  return data.id;
}

/**
 * Reports a fault on its own, with no inspection behind it.
 *
 * "The AC has stopped working", halfway through a route. The database allows a
 * defect with no submission on purpose, and the console has a panel for
 * exactly these — a driver should not have to fill in a full pre-trip form to
 * tell the office something is broken.
 */
export async function reportDefect(
  orgId: string,
  driverId: string,
  vehicleId: string,
  defect: DefectInput,
): Promise<string> {
  const { data, error } = await supabase
    .from('defects')
    .insert({
      org_id: orgId,
      vehicle_id: vehicleId,
      reported_by_driver: driverId,
      area: defect.area.trim(),
      finding: defect.finding.trim(),
      severity: defect.severity,
      status: 'open',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * Files a fault, and optionally asks the workshop to book the job in.
 *
 * The work order goes FIRST when one is wanted, so the defect can point at it
 * — a driver cannot update a defect afterwards (no update policy, on purpose:
 * a driver who could edit a defect could mark their own truck sound), so the
 * link has to be set on insert or never.
 *
 * If the work order fails, the defect is still filed and the caller is told
 * separately. That is the safe direction: a fault on record with no job raised
 * is a nuisance the office can fix, and a fault that vanished because the
 * workshop request failed is a truck driving around with an unreported
 * problem. The reverse leak — a work order with no defect behind it — is
 * litter rather than lost data, and the office can cancel it.
 */
export async function fileFault(
  orgId: string,
  driverId: string,
  vehicleId: string,
  input: DefectInput & { askWorkshop: boolean; at: string },
): Promise<{ defectId: string; workOrderId: string | null; workshopError: string | null }> {
  let workOrderId: string | null = null;
  let workshopError: string | null = null;

  if (input.askWorkshop) {
    try {
      workOrderId = await raiseWorkOrder(orgId, driverId, vehicleId, {
        title: input.finding.trim() || input.area.trim(),
        description: `${input.area.trim()} — reported from the driver app.`,
        openedAt: input.at,
      });
    } catch (cause) {
      workshopError = cause instanceof Error ? cause.message : 'Unknown error';
    }
  }

  const { data, error } = await supabase
    .from('defects')
    .insert({
      org_id: orgId,
      vehicle_id: vehicleId,
      reported_by_driver: driverId,
      area: input.area.trim(),
      finding: input.finding.trim(),
      severity: input.severity,
      status: 'open',
      work_order_id: workOrderId,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return { defectId: data.id, workOrderId, workshopError };
}

export async function loadMyDefects(driverId: string) {
  const { data, error } = await supabase
    .from('defects')
    .select('id, area, finding, severity, status, created_at, work_order_id')
    .eq('reported_by_driver', driverId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function loadMyInspections(driverId: string) {
  const { data, error } = await supabase
    .from('form_submissions')
    .select('id, submitted_at, status, forms(name)')
    .eq('driver_id', driverId)
    .order('submitted_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    submittedAt: r.submitted_at,
    status: r.status,
    formName: (r.forms as { name: string } | null)?.name ?? '',
  }));
}

export type MyWorkOrder = {
  id: string;
  reference: string | null;
  title: string;
  description: string | null;
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  openedAt: string | null;
  completedAt: string | null;
  vehicleId: string;
  /** True when this driver raised it, rather than the office. */
  mine: boolean;
};

/**
 * Repairs on trucks this driver has driven.
 *
 * Completed ones are included now, where they used to be filtered out. A
 * driver who reported soft brakes wants to see the job closed — that is the
 * whole reason they look at this screen — and a list that dropped a job the
 * moment it was finished read as though the request had been ignored.
 */
export async function loadMyWorkOrders(driverId: string): Promise<MyWorkOrder[]> {
  const { data, error } = await supabase
    .from('work_orders')
    .select(
      'id, reference, title, description, status, opened_at, completed_at, vehicle_id, requested_by_driver',
    )
    .is('deleted_at', null)
    .order('opened_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []).map((w) => ({
    id: w.id,
    reference: w.reference,
    title: w.title,
    description: w.description,
    status: w.status,
    openedAt: w.opened_at,
    completedAt: w.completed_at,
    vehicleId: w.vehicle_id,
    mine: w.requested_by_driver === driverId,
  }));
}

/**
 * Asks the workshop for a job on the truck the driver is signed on to.
 *
 * Deliberately thin. Everything that costs money — labour, parts, who takes
 * the job — is left null and stays the workshop's to fill in; the insert
 * policy refuses the row otherwise. A driver is telling the office what needs
 * doing, not booking it in.
 *
 * `openedAt` comes from the caller, not now(): the driver taps this standing
 * next to the truck, which is often where there is no signal.
 */
export async function raiseWorkOrder(
  orgId: string,
  driverId: string,
  vehicleId: string,
  input: { title: string; description: string; openedAt: string },
): Promise<string> {
  const { data, error } = await supabase
    .from('work_orders')
    .insert({
      org_id: orgId,
      vehicle_id: vehicleId,
      requested_by_driver: driverId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      status: 'open',
      opened_at: input.openedAt,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * Calls back when a fault this driver reported changes, or an inspection they
 * filed is reviewed.
 *
 * Both are the office acting on something the driver sent, and both used to
 * arrive only when the screen was reopened. A driver who reports soft brakes
 * and sees nothing move assumes nobody read it — which is how reporting stops.
 *
 * Not filtered server-side. defects keys on reported_by_driver and
 * form_submissions on driver_id, and a channel can carry one filter per table,
 * so the narrowing is left to the select policies — which are evaluated per
 * row on the socket anyway. The cost is a phone woken for rows it discards,
 * and a fleet files a handful of these a day, not a stream.
 */
export function onMyReportsChanged(onChange: () => void): () => void {
  const channel = supabase
    .channel(nextTopic('my-reports'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'defects' }, () => onChange())
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'form_submissions' },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Takes back a repair request the driver raised.
 *
 * Cancel, not close. There is no way for a driver to mark a job completed and
 * there should not be: a driver who could close a repair could close one that
 * never happened, and the next person to read that record is an inspector
 * asking why a truck with a reported brake fault was on the road.
 *
 * The policy allows this only while the job is still open and only on rows
 * this driver raised — once the workshop has picked it up, calling it off is
 * their decision, not a surprise from the cab.
 */
export async function cancelMyWorkOrder(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('work_orders')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select('id');

  if (error) throw new Error(error.message);
  /*
   * An update that matches no row under RLS is not an error — it is an empty
   * result. Without this check a driver whose request had just been assigned
   * would see the button succeed and nothing change.
   */
  if ((data ?? []).length === 0) throw new Error('That request can no longer be cancelled.');
}

/**
 * Calls back when a repair on this driver's truck changes.
 *
 * Not filtered to the driver, unlike the other subscriptions: a work order
 * belongs to a VEHICLE, and there is no driver_id column to filter on. The
 * select policy does the narrowing — it only returns work orders for trucks
 * this driver has been assigned to — and that policy is evaluated per row on
 * the socket, so nothing else arrives.
 *
 * The cost is that the server cannot pre-filter, so the phone is woken for
 * rows it then discards. Acceptable here: a workshop closes a handful of jobs
 * a day, not a stream.
 */
export function onMyWorkOrdersChanged(onChange: () => void): () => void {
  const channel = supabase
    .channel(nextTopic('work-orders'))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'work_orders' },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'defects' },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/* ========================================================================
   Messages
   ======================================================================== */

export type Message = {
  id: string;
  direction: 'to_driver' | 'from_driver';
  body: string;
  sentAt: string;
  readAt: string | null;
};

export async function loadMessages(driverId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, direction, body, sent_at, read_at')
    .eq('driver_id', driverId)
    .order('sent_at', { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    id: m.id,
    direction: m.direction,
    body: m.body,
    sentAt: m.sent_at,
    readAt: m.read_at,
  }));
}

/*
 * Realtime channels are keyed by topic, and supabase-js hands back the SAME
 * channel object for a topic that already exists. Two screens subscribing to
 * "messages:<driver>" therefore share one channel — and the second `.on()`
 * lands after the first has already called `.subscribe()`, which throws:
 *
 *   cannot add `postgres_changes` callbacks for realtime:… after `subscribe()`
 *
 * A counter makes every subscription its own channel. Deliberately not a
 * random id: this shows up in the Supabase dashboard, and "messages:<id>#3" is
 * something you can count and reason about, where a random suffix is noise.
 */
/**
 * A short unique tail for a storage path.
 *
 * Not crypto.randomUUID: Hermes has it only on newer versions, and a storage
 * path is not a security boundary — it stops two drivers photographing
 * "note.jpg" from overwriting each other, and the folder above it is already
 * scoped to one driver by policy.
 */
function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let channelSeq = 0;

function nextTopic(name: string): string {
  channelSeq += 1;
  return `${name}#${channelSeq}`;
}

/** How many messages from the office this driver has not read. */
export async function unreadMessageCount(driverId: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('driver_id', driverId)
    .eq('direction', 'to_driver')
    .is('read_at', null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Calls back when a route of this driver's is created or changed.
 *
 * Filtered to them server-side. A depot's other routes are none of their
 * business and would wake the phone for nothing.
 */
export function onMyRoutesChanged(driverId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(nextTopic(`routes:${driverId}`))
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'routes',
        filter: `driver_id=eq.${driverId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Calls back when this driver is put on, or taken off, a truck.
 *
 * Fires for the driver's own pick as well as the office's. The app cannot tell
 * them apart from here — an assignment row looks the same either way — so the
 * caller checks whether the truck actually changed before it says anything.
 */
export function onMyAssignmentChanged(driverId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(nextTopic(`assignments:${driverId}`))
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'driver_vehicle_assignments',
        filter: `driver_id=eq.${driverId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Calls back when this driver's duty log changes anywhere.
 *
 * Both tables on one channel, because both answer the same question — is what
 * this screen is showing still what the record says — and one socket topic is
 * cheaper than two. Two `.on()` calls before `subscribe()` is the supported
 * shape; adding one after is the error the topic counter exists to avoid.
 *
 * This fires for the phone's own writes too. It has to: the client cannot tell
 * its own insert from the other device's, because a duty event row looks the
 * same either way. The caller collapses a burst into one read rather than
 * trying to guess.
 *
 * duty_status_events covers a status change and a correction being reviewed.
 * hos_daily_logs covers certification, which is the one a second screen most
 * needs — certifying a day twice is a thing a driver gets asked about.
 */
export function onMyDutyChanged(driverId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(nextTopic(`duty:${driverId}`))
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'duty_status_events',
        filter: `driver_id=eq.${driverId}`,
      },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'hos_daily_logs',
        filter: `driver_id=eq.${driverId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Calls back whenever this driver's thread changes.
 *
 * The filter is applied by the server, so a phone is not woken for every
 * message in the fleet — a forty-truck depot would otherwise push forty times
 * the traffic to each device for one thread.
 *
 * Row-level security is evaluated per row on the socket too, so this could not
 * carry a colleague's thread even without the filter. The filter is about
 * bandwidth; the policy is about privacy.
 *
 * Returns the unsubscribe function. INSERT and UPDATE both matter: a new
 * message is an insert, and a read receipt is an update.
 */
export function onMessagesChanged(driverId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(nextTopic(`messages:${driverId}`))
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `driver_id=eq.${driverId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function sendMessage(
  orgId: string,
  driverId: string,
  body: string,
): Promise<void> {
  const { error } = await supabase.from('messages').insert({
    org_id: orgId,
    driver_id: driverId,
    direction: 'from_driver',
    body: body.trim(),
    sent_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Not awaited by the caller: a read receipt is not worth blocking on. */
export async function markMessagesRead(driverId: string): Promise<void> {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('driver_id', driverId)
    .eq('direction', 'to_driver')
    .is('read_at', null);
}

/* ========================================================================
   Training
   ======================================================================== */

export type MyCourse = {
  assignmentId: string;
  courseId: string;
  title: string;
  /** What the driver reads. Null when the course is a file with no write-up. */
  description: string | null;
  /**
   * Storage path of the material, not a URL — the bucket is private, so a
   * stored URL would be dead within the hour. Null when there is no file.
   */
  contentPath: string | null;
  lengthMinutes: number | null;
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
  dueOn: string | null;
  completedAt: string | null;
  /** Seconds already spent on it, across every previous sitting. */
  secondsSpent: number;
};

/**
 * The courses this driver has been given.
 *
 * Reads course_assignments, not courses: a published course visible to the
 * whole depot is one the driver COULD be given, and listing those would tell a
 * driver they owe training nobody asked them to do. The join brings the course
 * itself along so the list does not need a second round trip per row.
 */
export async function loadMyCourses(driverId: string): Promise<MyCourse[]> {
  const { data, error } = await supabase
    .from('course_assignments')
    .select(
      'id, status, due_on, completed_at, seconds_spent, courses(id, title, description, content_url, length_minutes)',
    )
    .eq('driver_id', driverId)
    .is('deleted_at', null)
    .order('due_on', { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((a) => {
    const course = a.courses as {
      id: string;
      title: string;
      description: string | null;
      content_url: string | null;
      length_minutes: number | null;
    } | null;
    return {
      assignmentId: a.id,
      courseId: course?.id ?? '',
      title: course?.title ?? '',
      description: course?.description ?? null,
      contentPath: course?.content_url ?? null,
      lengthMinutes: course?.length_minutes ?? null,
      status: a.status,
      dueOn: a.due_on,
      completedAt: a.completed_at,
      secondsSpent: a.seconds_spent ?? 0,
    };
  });
}

/** A short-lived link to the material, minted when the driver opens it. */
export async function courseContentUrl(storagePath: string | null): Promise<string | null> {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from('training')
    // An hour, not a minute like documents: this one may be handed to the
    // phone's own PDF or video viewer, which fetches it again as the driver
    // scrolls or seeks.
    .createSignedUrl(storagePath, 60 * 60);
  if (error) throw new Error(error.message);
  return data?.signedUrl ?? null;
}

/**
 * Save how far through a course the driver is.
 *
 * `secondsSpent` is the running total, not a delta, and the caller starts from
 * the value it loaded — so a save can only ever move it forward. A delta would
 * double-count the moment a save was retried after a timeout, which on a phone
 * in a yard with one bar is not rare.
 *
 * `startedAt` is written only when the row has none. Sending it on every resume
 * would keep moving the moment the driver first opened the course, and "when
 * did they start" is the one thing that row is for.
 */
export async function saveCourseProgress(
  assignmentId: string,
  input: {
    status: 'in_progress' | 'completed';
    secondsSpent: number;
    /** When this sitting began, from the caller — not now(); the save may be late. */
    at: string;
  },
): Promise<void> {
  const existing = await supabase
    .from('course_assignments')
    .select('started_at')
    .eq('id', assignmentId)
    .single();
  if (existing.error) throw new Error(existing.error.message);

  const { error } = await supabase
    .from('course_assignments')
    .update({
      status: input.status,
      seconds_spent: Math.max(0, Math.round(input.secondsSpent)),
      ...(existing.data.started_at ? {} : { started_at: input.at }),
      // The table refuses a completed row with no completed_at.
      ...(input.status === 'completed' ? { completed_at: input.at } : {}),
    })
    .eq('id', assignmentId);
  if (error) throw new Error(error.message);
}

/* ========================================================================
   Settings
   ======================================================================== */

export type DriverSettings = {
  distanceUnit: 'km' | 'mi';
  notifyPush: boolean;
  notifyEmail: boolean;
  notifyBreakReminder: boolean;
};

const DEFAULT_SETTINGS: DriverSettings = {
  distanceUnit: 'km',
  notifyPush: true,
  notifyEmail: false,
  notifyBreakReminder: true,
};

/**
 * This driver's own preferences.
 *
 * A separate table from `drivers` on purpose, and the reason is worth keeping
 * written down: row-level security grants a whole ROW, never a column. A
 * driver allowed to write their own `drivers` row could change their name,
 * their depot and their employment status. What is genuinely theirs to change
 * lives here instead.
 *
 * No row yet is not an error — a driver who has never opened this screen has
 * none. The defaults are returned so the screen has something to draw.
 */
export async function loadMySettings(driverId: string): Promise<DriverSettings> {
  const { data, error } = await supabase
    .from('driver_settings')
    .select('distance_unit, notify_push, notify_email, notify_break_reminder')
    .eq('driver_id', driverId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return DEFAULT_SETTINGS;

  return {
    distanceUnit: data.distance_unit === 'mi' ? 'mi' : 'km',
    notifyPush: data.notify_push ?? DEFAULT_SETTINGS.notifyPush,
    notifyEmail: data.notify_email ?? DEFAULT_SETTINGS.notifyEmail,
    notifyBreakReminder: data.notify_break_reminder ?? DEFAULT_SETTINGS.notifyBreakReminder,
  };
}

/**
 * Saves them, creating the row the first time.
 *
 * upsert on driver_id, because the row may not exist and the driver cannot be
 * asked to care which. org_id is sent so the insert case has one — the table
 * requires it, and the policy checks driver_id rather than org, so a wrong org
 * would be accepted and then be wrong forever.
 */
export async function saveMySettings(
  orgId: string,
  driverId: string,
  next: DriverSettings,
): Promise<void> {
  const { error } = await supabase.from('driver_settings').upsert(
    {
      driver_id: driverId,
      org_id: orgId,
      distance_unit: next.distanceUnit,
      notify_push: next.notifyPush,
      notify_email: next.notifyEmail,
      notify_break_reminder: next.notifyBreakReminder,
    },
    { onConflict: 'driver_id' },
  );
  if (error) throw new Error(error.message);
}

/* ========================================================================
   My documents
   ======================================================================== */

export async function loadMyDocuments(driverId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('id, category, doc_type, title, expires_on, storage_path, created_at')
    .eq('driver_id', driverId)
    .is('deleted_at', null)
    .order('expires_on', { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** What a driver can file from the cab. Compliance paperwork is the office's. */
export const TRIP_DOC_TYPES = [
  'proof_of_delivery',
  'bill_of_lading',
  'receipt',
  'fuel_docket',
  'other',
] as const;

export type TripDocType = (typeof TRIP_DOC_TYPES)[number];

/**
 * Files a photograph of paperwork from the cab.
 *
 * Trip category only, and that is not a shortcut — it is the whole of what the
 * storage policy allows. A driver writes under
 *
 *   <org_id>/trip/<driver_id>/…
 *
 * and nothing else: they can read their own licence and medical but never
 * write them, because a driver who could replace their own medical
 * certificate is the entire reason that certificate is on file.
 *
 * The file goes up first. A row pointing at a file that is not there is a
 * broken document; a file with no row is litter the office can sweep.
 */
export async function uploadTripDocument(
  orgId: string,
  driverId: string,
  input: {
    docType: TripDocType;
    title: string;
    /** The file's contents, base64, straight from the picker. */
    base64: string;
    fileName: string;
    mimeType: string;
    vehicleId?: string | null;
    /** The stop it was signed at, when it came from one. */
    stopId?: string | null;
  },
): Promise<string> {
  const safeName = input.fileName.replace(/[^A-Za-z0-9._-]+/g, '-').slice(-80);
  const path = `${orgId}/trip/${driverId}/${randomId()}-${safeName}`;

  /*
   * Decoded from base64, not read from the uri.
   *
   * `fetch(uri).then(r => r.arrayBuffer())` is what Supabase's own React
   * Native example does, and in a bare app it resolves with an EMPTY buffer —
   * no error, a zero-byte object stored, and a driver told their paperwork was
   * sent. FormData is no better: it uploads nothing on Android and answers 200.
   *
   * So the picker hands over the contents and this turns them into bytes.
   */
  const bytes = base64ToBytes(input.base64);
  if (bytes.length === 0) throw new Error('That photo could not be read.');

  const upload = await supabase.storage.from('documents').upload(path, bytes, {
    contentType: input.mimeType,
    upsert: false,
  });
  if (upload.error) throw new Error(upload.error.message);

  const { data, error } = await supabase
    .from('documents')
    .insert({
      org_id: orgId,
      category: 'trip',
      /*
       * Two different columns, and the difference matters.
       *
       *   driver_id           who the document is ABOUT
       *   uploaded_by_driver  who filed it
       *
       * The insert policy keys on the second, not the first — a driver may
       * file paperwork, and may not file paperwork claiming to be somebody
       * else's work. For a delivery note they are the same person, but they
       * are not the same question, and setting only driver_id was refused.
       */
      driver_id: driverId,
      uploaded_by_driver: driverId,
      vehicle_id: input.vehicleId ?? null,
      /* Filed against the actual stop, so the office does not have to match a
         note to a job by reading its title. */
      stop_id: input.stopId ?? null,
      doc_type: input.docType,
      title: input.title.trim() || input.fileName,
      storage_path: path,
      mime_type: input.mimeType,
      size_bytes: bytes.byteLength,
    })
    .select('id')
    .single();

  if (error) {
    // The row failed, so nothing points at the file. Take it back out rather
    // than leaving a paid-for object nobody can reach.
    await supabase.storage.from('documents').remove([path]);
    throw new Error(error.message);
  }

  return data.id;
}

/** A short-lived link, fetched when the driver taps rather than on render. */
export async function documentUrl(storagePath: string | null): Promise<string | null> {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 60);
  if (error) throw new Error(error.message);
  return data?.signedUrl ?? null;
}

/* ========================================================================
   This phone
   ======================================================================== */

/**
 * Registers the device so the office can push to it.
 *
 * Nothing sends push notifications yet — the token is stored and unused. It is
 * recorded from the start so that when sending is built, the fleet already has
 * tokens instead of waiting for every driver to reopen the app.
 */
export async function registerDevice(
  orgId: string,
  driverId: string,
  device: {
    platform: 'ios' | 'android';
    deviceName?: string | null;
    osVersion?: string | null;
    appVersion?: string | null;
    pushToken?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('driver_devices').insert({
    org_id: orgId,
    driver_id: driverId,
    platform: device.platform,
    device_name: device.deviceName ?? null,
    os_version: device.osVersion ?? null,
    app_version: device.appVersion ?? null,
    push_token: device.pushToken ?? null,
    last_seen_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
