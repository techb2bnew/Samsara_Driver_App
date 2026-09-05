/**
 * Every word the driver reads.
 *
 * Nothing user-facing is typed into a screen. One place to reword the app, one
 * place to translate it, and the screens stay about layout and behaviour.
 *
 * Grouped by screen. Anything a driver sees in more than one place lives in
 * `common`.
 */

export const APP_NAME = 'Samsara Driver';

export const splash = {
  tagline: 'Hours, route and inspections — in the cab.',
};

/** How long the branded splash stays up, even if the session is already known. */
export const SPLASH_MS = 3000;

export const common = {
  cancel: 'Cancel',
  save: 'Save',
  retry: 'Try again',
  back: 'Back',
  next: 'Next',
  done: 'Done',
  loading: 'Loading…',
  offline: 'No connection',
  offlineHint: 'Your work is saved on this phone and will sync when you are back online.',
  somethingWrong: 'Something went wrong',
  noNetwork: 'Check your connection and try again.',
  dash: '—',
};

export const onboarding = {
  skip: 'Skip',
  next: 'Next',
  start: 'Get started',
  steps: [
    {
      title: 'Your logbook, on your phone',
      body: 'Go on duty, drive, take your break. The app keeps your hours and you sign the day off before you finish.',
      chips: ['Hours', 'Sign off'],
    },
    {
      title: 'Your route, stop by stop',
      body: 'See where you are going, mark each stop as you reach it, and send the paperwork straight from the cab.',
      chips: ['Stops', 'Arrive'],
    },
    {
      title: 'Works without signal',
      body: 'Tunnels, hill roads, basement docks. Everything you do is saved on this phone and syncs when you are back online.',
      chips: ['Offline', 'Saved'],
    },
  ],
};

export const auth = {
  signIn: {
    title: 'Welcome back',
    subtitle: 'Sign in with the email and password your fleet office sent you.',
    emailLabel: 'Email',
    emailPlaceholder: 'Enter your email',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    show: 'Show',
    hide: 'Hide',
    submit: 'Sign in',
    forgot: 'Forgot password?',
    emailRequired: 'Enter your email',
    emailInvalid: 'Enter a valid email address',
    passwordRequired: 'Enter your password',
    passwordTooShort: 'Password must be at least 8 characters',
    failed: 'Those details did not work. Check them and try again.',
    notADriver:
      'This account is not set up as a driver. Ask your fleet office to check it.',
  },

  forgot: {
    title: 'Forgot password',
    subtitle: 'Enter your email and we will send a 6-digit code.',
    emailLabel: 'Email',
    submit: 'Send code',
    sent: 'Code sent',
    failed: 'That code could not be sent.',
  },

  otp: {
    title: 'Enter the code',
    subtitle: (email) => `We sent a 6-digit code to ${email}.`,
    codeLabel: 'Code',
    submit: 'Verify',
    resend: 'Send it again',
    resentToast: 'Code sent again',
    tooShort: 'Enter all 6 digits',
    failed: 'That code is wrong or has expired.',
  },

  newPassword: {
    title: 'Choose a password',
    subtitle: 'At least 8 characters. Nobody at the office will know it.',
    passwordLabel: 'New password',
    passwordPlaceholder: 'Enter a new password',
    confirmLabel: 'Confirm password',
    confirmPlaceholder: 'Re-enter your password',
    submit: 'Save password',
    passwordRequired: 'Enter a new password',
    confirmRequired: 'Confirm your password',
    tooShort: 'Password must be at least 8 characters',
    mismatch: 'Both passwords have to match',
    failed: 'That password could not be saved.',
    savedToast: 'Password saved',
  },
};

export const tabs = {
  duty: 'Duty',
  route: 'Route',
  inspect: 'Inspect',
  messages: 'Messages',
  me: 'Me',
};

export const vehiclePicker = {
  title: 'Which truck today?',
  subtitle: 'Pick the truck you are driving. Your hours and your position are recorded against it.',
  empty: 'No trucks at your depot',
  emptyHint: 'Ask your fleet office to add a truck to your depot, or to assign you one.',
  select: 'Start shift',
  change: 'Change truck',
  current: 'You are on',
  // Not "taken by Rahul": which truck is unavailable is a fact about the
  // truck, and the app is not handed who is on it.
  inUse: 'Another driver is on this truck',
  inUseShort: 'In use',
  failed: 'That could not be saved.',
};

export const duty = {
  title: 'Duty status',
  hello: (name) => `Hi, ${name}`,
  status: {
    off: 'Off duty',
    sleeper: 'Sleeper',
    driving: 'Driving',
    on_duty: 'On duty',
  },
  since: (time) => `Since ${time}`,
  // Reads next to the start time: "Since 09:00 · 1:23".
  elapsed: (clock) => `· ${clock}`,
  todayTitle: 'Today',
  today: 'Today',
  yesterday: 'Yesterday',
  backToToday: 'Back to today',
  previousDay: 'Previous day',
  nextDay: 'Next day',
  oldestLoaded: 'Older logs are not loaded on this phone.',
  pastDayNote: 'You are looking at a past day. Status changes always record now.',
  certifyDay: 'Certify this log',
  certifiedOn: 'Certified',
  drivingToday: 'Driving today',
  onDutyToday: 'On duty today',
  longestBreak: 'Longest break',
  recap: {
    hoursLeft: 'Hours left',
    onDuty: 'On Duty',
    driving: 'Driving',
    breakIn: 'Break',
    cycle: 'Cycle',
    noRegulator: 'Your office has not chosen a rule book, so these are not calculated.',
  },
  dispatchStatus: 'Dispatch status',
  available: 'Available',
  certify: 'Certify today’s log',
  certified: 'Certified',
  certifyHint: 'This is your signature on the day. Check it before you sign.',
  certifiedToast: 'Log certified',
  noVehicle: 'Pick a truck before you go on duty',
  changeFailed: 'That status change was not saved. It is queued and will retry.',
};

export const routeScreen = {
  mapTitle: 'Route map',
  mapEmpty: 'Nothing to draw yet',
  mapEmptyHint: 'This route has no stops with a location on them, so there is no line to show.',
  mapStops: (n) => `${n} ${n === 1 ? 'stop' : 'stops'}`,
  mapDistance: (km) => `${km} km planned`,
  mapStraightLine: 'Joined in a straight line — the office planned this route without a road path.',
  mapRecentre: 'Show the whole route',
  mapMyLocation: 'My location',
  openMap: 'Open map',

  title: 'My route',
  nextStop: 'Next stop',
  routeComplete: 'All stops done',
  stops: 'Stops',
  empty: 'No route assigned',
  emptyHint: 'Your fleet office assigns routes. Nothing for you right now.',
  stopsDone: (done, total) => `${done} of ${total} stops`,
  arrived: 'Arrived',
  arrivedAt: (time) => `Arrived ${time}`,
  markArrived: 'Mark arrived',
  window: (from, to) => `${from} – ${to}`,
  noWindow: 'No time window',
  addPhoto: 'Add paperwork',
  arrivedToast: 'Stop marked',
  failed: 'That could not be saved. It is queued and will retry.',
};

export const inspect = {
  title: 'Inspection',
  forms: 'Forms',
  preTrip: 'Pre-trip',
  postTrip: 'Post-trip',
  empty: 'No forms to fill in',
  emptyHint: 'Your fleet office publishes the forms you use.',
  submit: 'Submit inspection',
  submittedToast: 'Inspection sent',
  addDefect: 'Report a fault',
  defectArea: 'What part',
  defectFinding: 'What is wrong',
  defectSeverity: 'How bad',
  severity: {
    minor: 'Minor',
    major: 'Major',
    out_of_service: 'Unsafe to drive',
  },
  defectPhoto: 'Add a photo',
  defectSubmit: 'Send fault report',
  defectToast: 'Fault reported',
  reportAlone: 'Report a fault without a full inspection',
  myWorkOrders: 'Repairs on my truck',
  noWorkOrders: 'No repairs open',

  // Filling a form in
  formIntro: 'Check each item. Anything not right, mark it and say what is wrong.',
  pass: 'OK',
  fail: 'Not OK',
  faultsFound: (n) => `${n} ${n === 1 ? 'fault' : 'faults'} to report`,
  noFaults: 'Nothing wrong found',
  answerAll: 'Check every item before you send this',
  findingRequired: 'Say what is wrong with it',
  noVehicle: 'Pick a truck before you file an inspection',
  submitFailed: 'That was not sent. Nothing has been filed.',

  // Asking the workshop to do the job
  askWorkshop: 'Ask the workshop to book this in',
  askWorkshopHint: 'The office sees the fault either way. Turn this on if it needs a job raising.',
  workshopFailed: 'The fault was filed, but the repair request was not. Tell the office.',
};

export const repairs = {
  title: 'Repairs on my truck',
  subtitle: 'Jobs the workshop has open on the truck you are signed on to',
  empty: 'No repairs on this truck',
  emptyHint: 'Anything you or the office raises appears here with its status.',
  mine: 'You asked for this',
  open: 'Open',
  assigned: 'With a mechanic',
  in_progress: 'Being fixed',
  completed: 'Done',
  cancelled: 'Cancelled',
  raisedOn: (date) => `Raised ${date}`,
  doneOn: (date) => `Done ${date}`,

  // Raising one
  raise: 'Ask for a repair',
  raiseHint: 'Something that needs doing on your truck — a service, a part, a fix',
  raiseTitle: 'What needs doing',
  raiseTitlePlaceholder: 'Air conditioning has stopped working',
  raiseDetail: 'Anything else the workshop should know',
  raiseDetailPlaceholder: 'Blows warm on both settings. Started this morning.',
  raiseSubmit: 'Send to the workshop',
  raiseToast: 'Sent to the workshop',
  titleRequired: 'Say what needs doing',
  raiseFailed: 'That was not sent.',
  noVehicle: 'Pick a truck before you ask for a repair',

  // Taking one back
  cancel: 'Take this back',
  cancelConfirm: 'Take back this request?',
  cancelHint: 'The workshop stops seeing it. You can ask again any time.',
  cancelToast: 'Request taken back',
  cancelFailed: 'That could not be taken back — the workshop may have already started it.',
  // Only their own, and only before anyone picks it up. Said on the row so a
  // driver is not hunting for a button that is not there.
  cancelOnlyOpen: 'The workshop has this now',
};

export const dayLog = {
  subtitle: 'One day, as it was recorded',
  events: 'What was recorded',
  noEvents: 'Nothing recorded on this day',
  noEventsHint: 'No duty status was set, so there is no log to show.',
  totals: 'Totals',
  correctThis: 'This is wrong — ask for a correction',
  pending: 'Correction asked for',
  eventAt: (time) => `from ${time}`,
  queued: 'Not sent yet',
  tapToCorrect: 'Tap a row if it is wrong',
  // What happened to a correction the driver asked for. Rejected has to be
  // said out loud — a driver who hears nothing assumes it is still waiting.
  correctionPending: 'Correction asked for',
  correctionRejected: 'Correction refused',
};

export const stopDetail = {
  sequence: (n) => `Stop ${n}`,
  address: 'Address',
  window: 'Time window',
  status: 'Status',
  waiting: 'Not arrived yet',
  openInMap: 'Show on the map',
  markArrived: 'I have arrived',
  arrivedConfirm: 'Mark this stop as arrived?',
  arrivedHint: 'The office sees this straight away. The time recorded is now.',
  alreadyArrived: 'You marked this stop arrived.',
  noLocation: 'The office did not put a location on this stop.',

  // The arrival check
  checking: 'Checking where you are…',
  tooFar: (away) => `You are ${away} from this stop. Get closer to mark it arrived.`,
  closeEnough: (away) => `You are ${away} away.`,
  // Not a refusal. A yard between two warehouses has no signal, and a driver
  // standing at the right gate still has to be able to work.
  noFix: 'Your position could not be checked, so this will be recorded as unverified.',
  denied: 'Location is turned off for this app, so the arrival will be recorded as unverified.',
  unverified: 'Recorded without a position check',
  verified: (away) => `Checked — you were ${away} away`,
  retryFix: 'Check again',
};

export const messages = {
  title: 'Messages',
  office: 'Fleet office',
  empty: 'No messages',
  emptyHint: 'Messages from your fleet office appear here.',
  placeholder: 'Write a message',
  send: 'Send',
  failed: 'That message was not sent.',
};

export const me = {
  title: 'Me',
  profile: 'My details',
  employeeNumber: 'Employee number',
  depot: 'Depot',
  licence: 'Licence expires',
  vehicle: 'Current truck',
  history: 'My history',
  logs: 'My logs',
  inspections: 'My inspections',
  faults: 'My fault reports',
  violations: 'My violations',
  noViolations: 'No violations',
  correction: 'Ask for a log correction',
  training: 'Training',
  noTraining: 'No courses assigned',
  documents: 'My documents',
  settings: 'Settings',
  signOut: 'Sign out',
  signOutConfirm: 'Sign out of this phone?',
  signOutHint: 'Anything not yet synced stays on this phone until you sign in again.',
};

export const correction = {
  title: 'Log correction',
  subtitle: 'Tell the office what the log should say. They decide.',
  fromStatus: 'Recorded as',
  toStatus: 'Should be',
  reason: 'Why',
  reasonPlaceholder: 'Waiting at the depot gate, not working',
  submit: 'Send request',
  sentToast: 'Request sent',
  reasonRequired: 'Say why — the office needs a reason to accept it',
  failed: 'That request was not sent.',
  pickTitle: 'Which entry is wrong?',
  pickHint: 'Pick the one that was recorded incorrectly.',
  pickEmpty: 'Nothing recorded yet',
  pickEmptyHint: 'Once your log has entries you can ask for a correction here.',
  pickAt: (day, time) => `${day} · from ${time}`,
  alreadyPending: 'You have already asked about this one. The office has not decided yet.',
  wasRejected: 'The office refused your last request on this row. You can ask again with more detail.',
};

export const myLogs = {
  subtitle: 'Every day this phone has loaded, and whether you signed it',
  empty: 'No days recorded yet',
  emptyHint: 'Set your duty status and the day starts recording.',
  certified: 'Signed',
  uncertified: 'Not signed',
  noEvents: 'Nothing recorded',
  hours: (driving, onDuty) => `${driving} driving · ${onDuty} on duty`,
  window: (n) => `Last ${n} days`,
  // The window is what the phone holds, not what exists. Saying so stops a
  // driver reading an empty older day as lost data.
  olderHint: 'Older days are not loaded on this phone. Ask the office for them.',
};

export const myInspections = {
  subtitle: 'Inspections you have filed',
  empty: 'No inspections yet',
  // Deliberately not "fill in a form from the Inspect tab": the console's form
  // builder is switched off, so there is no form to fill in and that hint sent
  // drivers looking for a screen that is not there.
  emptyHint: 'Inspections you file appear here, with what the office made of them.',
  status: {
    submitted: 'Sent',
    reviewed: 'Reviewed by the office',
    flagged: 'Flagged by the office',
  },
};

export const myFaults = {
  subtitle: 'Faults you have reported',
  empty: 'No faults reported',
  emptyHint: 'Anything you report from the Inspect tab appears here with its status.',
  status: {
    open: 'Open',
    in_repair: 'Being fixed',
    resolved: 'Fixed',
    dismissed: 'Closed without work',
  },
  severity: {
    minor: 'Minor',
    major: 'Major',
    out_of_service: 'Unsafe to drive',
  },
  hasWorkOrder: 'A repair job was raised',
};

export const myDocuments = {
  subtitle: 'Your paperwork, and the truck’s',
  empty: 'No documents',
  emptyHint: 'Your fleet office files your licence and medical here.',
  expires: (date) => `Expires ${date}`,
  expired: 'Expired',
  expiringSoon: (days) => `Expires in ${days} ${days === 1 ? 'day' : 'days'}`,
  noExpiry: 'No expiry date',
  open: 'Open',
  openFailed: 'That file could not be opened.',
  category: {
    compliance: 'Compliance',
    trip: 'Trip paperwork',
    vehicle: 'Vehicle',
  },
};

export const paperwork = {
  title: 'Add paperwork',
  subtitle: 'Photograph a delivery note, a receipt or a fuel docket',
  // The office files licences and medicals. A driver reads those, never writes
  // them — so nothing here offers to.
  tripOnly: 'Your licence and medical are filed by the office. This is for paperwork from the job.',

  take: 'Take a photo',
  choose: 'Choose from photos',
  retake: 'Take another',
  unavailable: 'Photos are not available in this build. Ask for the app to be updated.',
  failed: 'That photo could not be used.',

  kind: 'What is it',
  types: {
    proof_of_delivery: 'Proof of delivery',
    bill_of_lading: 'Bill of lading',
    receipt: 'Receipt',
    fuel_docket: 'Fuel docket',
    other: 'Something else',
  },
  label: 'A note for the office',
  labelPlaceholder: 'Signed by the storeman at gate 2',
  labelHint: 'Optional. Helps the office find it later.',

  send: 'Send to the office',
  sentToast: 'Paperwork sent',
  sendFailed: 'That could not be sent.',
  needPhoto: 'Take or choose a photo first',
  noVehicle: 'Pick a truck first, so the office knows which one this is for',

  // On the stop
  atStop: 'Add paperwork for this stop',
};

export const settings = {
  subtitle: 'How this app behaves for you',
  units: 'Distance',
  unitsKm: 'Kilometres',
  unitsMi: 'Miles',
  notifications: 'Notifications',
  notifyPush: 'Push notifications',
  notifyPushHint: 'Not switched on yet — the office has to set this up first.',
  notifyEmail: 'Email me too',
  notifyBreak: 'Remind me to take a break',
  notifyBreakHint: 'Warns you before you run out of driving time.',
  account: 'Account',
  savedToast: 'Saved',
  failed: 'That could not be saved.',
  loadFailed: 'Your settings could not be loaded.',
};

export const violations = {
  title: 'Violations',
  subtitle: 'Worked out from your log, not stored anywhere',
  empty: 'No violations',
  emptyHint: 'Nothing has broken the hours rules.',
  noRegulator: 'Your office has not chosen a rule book, so nothing can be checked.',
  limit: 'Limit',
  actual: 'Recorded',
  over: 'Over by',
  kind: {
    daily_driving: 'Drove too long in a day',
    duty_window: 'On-duty window exceeded',
    missing_break: 'Drove too long without a break',
    cycle: 'Cycle limit exceeded',
  },
};

export const modal = {
  signOut: {
    title: 'Sign out?',
    message:
      'Anything not yet synced stays on this phone. It will send the next time you sign in.',
    confirm: 'Sign out',
  },

  deleteAccount: {
    title: 'Delete my account?',
    message:
      'Your duty logs, inspections and signatures are a legal record and are kept by your fleet — deleting your login does not remove them. Your fleet office has to do this for you.',
    confirm: 'Contact my office',
  },

  passwordChanged: {
    title: 'Password changed',
    message: 'Sign in with your new password.',
    action: 'Go to sign in',
  },

  discard: {
    title: 'Discard this?',
    message: 'What you have filled in will be lost.',
    confirm: 'Discard',
  },
};

/**
 * Titles for the nested screens inside each tab's stack.
 *
 * Separate from the tab labels above: a tab label has to fit under an icon and
 * stays one word, while a screen header can say what the screen actually is.
 */
export const training = {
  title: 'Training',
  subtitle: 'Courses the office has given you',
  empty: 'No courses assigned',
  emptyHint: 'When the office gives you a course it appears here.',

  // Section headings on the list
  todo: 'To do',
  done: 'Completed',

  // Row detail
  minutes: n => (n === null ? '' : `${n} min`),
  dueBy: date => `Due by ${date}`,
  noDeadline: 'No deadline',
  overdue: 'Overdue',
  notStarted: 'Not started',
  inProgress: 'In progress',
  completed: 'Completed',
  completedOn: date => `Completed ${date}`,

  // The course screen
  aboutThis: 'About this course',
  noDescription: 'The office did not add a write-up for this one.',
  material: 'Material',
  openFile: 'Open the file',
  openHint: 'Opens in your phone. Come back here when you are done.',
  openFailed: 'That file could not be opened.',
  noFile: 'There is no file for this course — read the notes above.',

  // The timer
  start: 'Start',
  resume: 'Resume',
  pause: 'Pause',
  timeLeft: 'Time left',
  spentSoFar: 'Time spent',
  // "3:20" — the shape a driver already reads on a phone.
  clock: (m, sec) => `${m}:${String(sec).padStart(2, '0')}`,
  gateHint: n => `You can mark this done after ${n} minutes.`,
  readyHint: 'You have spent long enough on this. Mark it done when you are.',
  markDone: 'Mark as done',
  markDoneConfirm: 'Mark this course as done?',
  markDoneHint: 'The office sees this as completed. You cannot undo it yourself.',
  doneToast: 'Course marked as done',
  saveFailed: 'That could not be saved. Your time is still on this phone.',
  alreadyDone: 'You finished this course.',
};

export const screenTitles = {
  // Duty stack
  vehiclePicker: 'Select your truck',
  dayLog: 'Day log',

  // Route stack
  stopDetail: 'Stop',
  routeMap: 'Route map',

  // Inspect stack
  inspectionForm: 'Inspection',
  reportFault: 'Report a fault',
  myRepairs: 'Repairs on my truck',

  // Me stack
  course: 'Course',
  raiseWorkOrder: 'Ask for a repair',
  myLogs: 'My logs',
  myInspections: 'My inspections',
  myFaults: 'My fault reports',
  myViolations: 'My violations',
  myDocuments: 'My documents',
  addPaperwork: 'Add paperwork',
  training: 'Training',
  requestCorrection: 'Log correction',
  settings: 'Settings',
  notifications: 'Notifications',
};

export const notifications = {
  title: 'Notifications',
  empty: 'Nothing new',
  emptyHint: 'New routes, truck changes and messages from your office appear here.',
  markAllRead: 'Mark all read',
  unread: (n) => (n === 1 ? '1 new' : `${n} new`),
  newMessage: 'New message',
  newMessageBody: 'Your fleet office sent you a message.',
  newRoute: 'New route',
  newRouteBody: (reference) => `Route ${reference} has been assigned to you.`,
  routeChanged: 'Route updated',
  routeChangedBody: (reference) => `Route ${reference} was changed by your office.`,
  vehicleChanged: 'Truck changed',
  vehicleChangedBody: (name) => `You are now signed on to ${name}.`,
  vehicleCleared: 'Truck removed',
  vehicleClearedBody: 'You are not signed on to a truck. Pick one before you go on duty.',
  breakDue: 'Break due soon',
  breakDueBody: (minutes, length) =>
    `About ${minutes} minutes of driving left before you need a ${length}-minute break.`,
  breakOverdue: 'Break needed now',
  breakOverdueBody: (length) =>
    `You have driven past the limit without a ${length}-minute break.`,
};

