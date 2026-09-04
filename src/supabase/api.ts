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
      .select('name, timezone, hos_regulator')
      .eq('id', data.org_id)
      .maybeSingle(),
    data.fleet_id
      ? supabase.from('fleets').select('name').eq('id', data.fleet_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (org.error) throw new Error(org.error.message);

  return {
    driverId: data.id,
    orgId: data.org_id,
    orgName: org.data?.name ?? '',
    // The driver's own timezone wins; it is copied from their depot when the
    // office creates them, and can be overridden for a secondment.
    timezone: data.timezone || org.data?.timezone || 'UTC',
    regulator: org.data?.hos_regulator ?? null,
    firstName: data.first_name,
    lastName: data.last_name,
    employeeNumber: data.employee_number,
    depotId: data.fleet_id,
    depotName: (depot.data as { name: string } | null)?.name ?? null,
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
export async function loadVehicleOptions(): Promise<VehicleOption[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, name, plate, make, model, odometer_km')
    .eq('kind', 'truck')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('name', { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((v) => ({
    id: v.id,
    name: v.name?.trim() || v.plate,
    plate: v.plate,
    makeModel: [v.make, v.model].filter(Boolean).join(' ').trim(),
    odometerKm: Number(v.odometer_km ?? 0),
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
export async function signOnToVehicle(
  orgId: string,
  driverId: string,
  vehicleId: string,
): Promise<void> {
  const now = new Date().toISOString();

  const closed = await supabase
    .from('driver_vehicle_assignments')
    .update({ ended_at: now })
    .eq('driver_id', driverId)
    .is('ended_at', null);
  if (closed.error) throw new Error(closed.error.message);

  const { error } = await supabase.from('driver_vehicle_assignments').insert({
    org_id: orgId,
    driver_id: driverId,
    vehicle_id: vehicleId,
    started_at: now,
  });
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
  status: DutyStatus;
  startedAt: string;
  vehicleId: string | null;
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
    .select('id, status, started_at, vehicle_id, edit_of_id')
    .eq('driver_id', driverId)
    .gte('started_at', fromIso)
    .lte('started_at', toIso)
    .order('started_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? [])
    // A proposed correction is not part of the day until it is accepted.
    .filter((e) => e.edit_of_id === null)
    .map((e) => ({
      id: e.id,
      status: e.status,
      startedAt: e.started_at,
      vehicleId: e.vehicle_id,
    }));
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
    .select('id, reference, status, planned_start_at, notes, path_polyline, planned_distance_km')
    .eq('driver_id', driverId)
    .in('status', ['planned', 'dispatched', 'in_progress'])
    .is('deleted_at', null)
    .order('planned_start_at', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const stops = await supabase
    .from('route_stops')
    .select('id, sequence, name, address, window_start_at, window_end_at, arrived_at, latitude, longitude')
    .eq('route_id', data.id)
    .order('sequence', { ascending: true });

  if (stops.error) throw new Error(stops.error.message);

  return {
    id: data.id,
    reference: data.reference ?? '',
    status: data.status,
    plannedStartAt: data.planned_start_at,
    notes: data.notes,
    path: parsePath(data.path_polyline),
    plannedDistanceKm:
      data.planned_distance_km === null ? null : Number(data.planned_distance_km),
    stops: (stops.data ?? []).map((s) => ({
      id: s.id,
      sequence: s.sequence,
      name: s.name,
      address: s.address,
      windowStartAt: s.window_start_at,
      windowEndAt: s.window_end_at,
      arrivedAt: s.arrived_at,
      latitude: s.latitude === null ? null : Number(s.latitude),
      longitude: s.longitude === null ? null : Number(s.longitude),
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
export async function markStopArrived(stopId: string, arrivedAt: string): Promise<void> {
  const { error } = await supabase
    .from('route_stops')
    .update({ arrived_at: arrivedAt })
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

/** Repairs on trucks this driver has driven. Read only — see the schema. */
export async function loadMyWorkOrders() {
  const { data, error } = await supabase
    .from('work_orders')
    .select('id, reference, title, status, opened_at, vehicle_id')
    .is('deleted_at', null)
    .neq('status', 'completed')
    .order('opened_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
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

export async function loadMyCourses(driverId: string) {
  const { data, error } = await supabase
    .from('course_assignments')
    .select('id, status, due_on, completed_at, courses(id, title, length_minutes)')
    .eq('driver_id', driverId)
    .is('deleted_at', null)
    .order('due_on', { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((a) => {
    const course = a.courses as { id: string; title: string; length_minutes: number | null } | null;
    return {
      assignmentId: a.id,
      courseId: course?.id ?? '',
      title: course?.title ?? '',
      lengthMinutes: course?.length_minutes ?? null,
      status: a.status,
      dueOn: a.due_on,
      completedAt: a.completed_at,
    };
  });
}

export async function setCourseProgress(
  assignmentId: string,
  status: 'in_progress' | 'completed',
): Promise<void> {
  const { error } = await supabase
    .from('course_assignments')
    .update({
      status,
      ...(status === 'in_progress' ? { started_at: new Date().toISOString() } : {}),
      // The table requires a completed_at on a completed row.
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', assignmentId);
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
