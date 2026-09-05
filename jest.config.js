module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],

  /*
   * Which node_modules jest is allowed to transform.
   *
   * The preset ignores node_modules wholesale, and most packages ship
   * CommonJS, so that is usually right. These ship untranspiled ESM, and the
   * default template test — which renders the whole App — has been failing on
   * gesture-handler's `import` since navigation was added.
   *
   * A permanently red suite is worse than no suite: it trains everyone to
   * ignore the output, and the next real failure goes unnoticed with it.
   */
  transformIgnorePatterns: [
    'node_modules/(?!(?:' +
      [
        'react-native',
        '@react-native',
        '@react-native-community',
        '@react-navigation',
        'react-native-gesture-handler',
        'react-native-maps',
        'react-native-reanimated',
        'react-native-safe-area-context',
        'react-native-screens',
        'react-native-url-polyfill',
        'react-native-vector-icons',
      ].join('|') +
      ')/)',
  ],
};
