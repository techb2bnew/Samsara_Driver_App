/**
 * Route names and their params, one list per navigator.
 *
 * Every tab gets its own stack rather than the tabs holding screens directly.
 * A driver opening a stop from the route, then the map from the stop, has to be
 * able to come back one step at a time — and each tab has to keep its own
 * position while they look at another one. A single shared stack would lose
 * both.
 *
 * Params carry ids, never objects. A navigation state can be serialised and
 * restored by the OS after the app is killed in the background, which happens
 * to a phone in a cradle all day; a whole row put in a param would come back
 * stale, while an id is re-read.
 */

export type AuthStackParams = {
  Login: undefined;
  ForgotPassword: undefined;
  VerifyOtp: { email: string };
  ResetPassword: { email: string };
};

export type DutyStackParams = {
  DutyHome: undefined;
  /*
   * Also reachable from Me. Registered in both stacks on purpose: a driver
   * looking at the bell on Duty should not be thrown into another tab, and a
   * driver browsing Me should not have to guess it lives under Duty.
   */
  Notifications: undefined;
  VehiclePicker: undefined;
  /** ISO date, e.g. 2026-09-03. */
  DayLog: { date: string };
  /*
   * Also in Me, like Notifications. A driver who spots a wrong row while
   * reading a day log should be able to challenge it there and come back to
   * the log, not be thrown into another tab.
   */
  RequestCorrection: { eventId: string } | undefined;
};

export type RouteStackParams = {
  RouteHome: undefined;
  StopDetail: { stopId: string };
  RouteMap: { routeId: string };
  /** Also in Me. Reached from the stop where the note was signed. */
  AddPaperwork: { stopId?: string; stopName?: string } | undefined;
};

export type InspectStackParams = {
  InspectHome: undefined;
  InspectionForm: { formId: string };
  /** Opened from an inspection, or on its own mid-route. */
  ReportFault: { formSubmissionId?: string } | undefined;
  /*
   * Asking the workshop for a job. Separate from ReportFault on purpose: a
   * fault is a finding about the truck, this is a request for work, and
   * sometimes there is no fault behind it at all.
   */
  RaiseWorkOrder: undefined;
  MyRepairs: undefined;
};

export type MessagesStackParams = {
  MessagesHome: undefined;
};

export type MeStackParams = {
  MeHome: undefined;
  MyLogs: undefined;
  /*
   * Also in Duty, like Notifications and RequestCorrection. A driver who
   * opened a day from their own log list should come back to that list, not
   * be thrown into the Duty tab.
   */
  DayLog: { date: string };
  MyInspections: undefined;
  MyFaults: undefined;
  MyViolations: undefined;
  MyDocuments: undefined;
  /*
   * Also in the Route stack. Paperwork happens in two places — at the stop
   * where a note is signed, and afterwards when somebody remembers — and a
   * driver reaching it from a stop should come back to that stop.
   *
   * The stop's name seeds the note, so the office gets it filed against the
   * right job without the driver typing it out.
   */
  AddPaperwork: { stopId?: string; stopName?: string } | undefined;
  Training: undefined;
  /*
   * The assignment id, not the course id. Two drivers on the same course have
   * their own progress, and the screen is showing one driver's.
   */
  Course: { assignmentId: string };
  RequestCorrection: { eventId: string } | undefined;
  Settings: undefined;
  Notifications: undefined;
};

/** What each tab hosts. Undefined because the stack owns its own params. */
export type TabParams = {
  DutyTab: undefined;
  RouteTab: undefined;
  InspectTab: undefined;
  MessagesTab: undefined;
  MeTab: undefined;
};
