/**
 * Native modules stood in for, so the app tree can be mounted in jest.
 *
 * The point of App.test.tsx is small but real: it mounts the whole thing once.
 * That is the test that would have caught "@react-native-community/geolocation
 * doesn't seem to be linked" — a module that throws when it is first touched,
 * which typechecking and bundling both let through because neither one runs
 * the code.
 *
 * Each mock is the smallest thing that lets the module load. They are not
 * pretending to work; nothing here asserts behaviour, only that importing and
 * rendering do not explode.
 */

require('react-native-gesture-handler/jestSetup');

/*
 * The env module, which only exists at bundle time.
 *
 * react-native-dotenv rewrites '@env' during the babel pass Metro runs; jest
 * uses a different babel config and never sees it. The values are deliberately
 * not the real ones — no test should reach Supabase, and a URL that resolves
 * would let one try.
 */
jest.mock(
  '@env',
  () => ({
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_PUBLISHABLE_KEY: 'test-key-not-a-real-one',
  }),
  { virtual: true },
);

jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
    requestAuthorization: jest.fn(),
    setRNConfiguration: jest.fn(),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(async () => ({ didCancel: true })),
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = (props) => React.createElement(View, props, props.children);
  return {
    __esModule: true,
    default: Stub,
    Marker: Stub,
    Polyline: Stub,
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('react-native-vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { __esModule: true, default: (props) => React.createElement(Text, props) };
});

/*
 * AsyncStorage, in memory.
 *
 * Written out rather than pulled from the package: this version ships no jest
 * mock. Without one every read rejects, and the providers that restore state
 * on mount fill the output with unhandled rejections that bury whatever the
 * test was actually about.
 */
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key) => Promise.resolve(store.get(key) ?? null)),
      setItem: jest.fn((key, value) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key) => {
        store.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
    },
  };
});
