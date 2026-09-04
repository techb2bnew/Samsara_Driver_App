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
export const SPLASH_MS = 4000;

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
  failed: 'That could not be saved.',
};

export const duty = {
  title: 'Duty status',
  status: {
    off: 'Off duty',
    sleeper: 'Sleeper',
    driving: 'Driving',
    on_duty: 'On duty',
  },
  since: (time) => `Since ${time}`,
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
    onDuty: 'On Duty',
    driving: 'Driving',
    breakIn: 'Break',
    cycle: 'HOS Recap',
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
};

export const messages = {
  title: 'Messages',
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
};

export const violations = {
  title: 'Violations',
  empty: 'No violations',
  emptyHint: 'Nothing has broken the hours rules.',
  limit: 'Limit',
  actual: 'Recorded',
  over: 'Over by',
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
  myLogs: 'My logs',
  myInspections: 'My inspections',
  myFaults: 'My fault reports',
  myViolations: 'My violations',
  myDocuments: 'My documents',
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
};

