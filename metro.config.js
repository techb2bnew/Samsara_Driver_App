const fs = require('node:fs');
const path = require('node:path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const RN_ROOT = path.dirname(require.resolve('react-native/package.json'));

/**
 * React Native 0.87.1 ships @react-native/virtualized-lists importing
 * `react-native/src/private/featureflags/ReactNativeFeatureFlags`, but
 * react-native's own package.json "exports" map does not expose
 * `./src/private/*`. Metro still finds the file by falling back to
 * file-based resolution, and logs a warning every time.
 *
 * Resolving these internal paths directly skips the exports map, which
 * silences the warning without patching node_modules. Remove this once
 * upstream exposes the subpath.
 */
function resolveReactNativeInternals(context, moduleName, platform) {
  if (moduleName.startsWith('react-native/src/private/')) {
    const relative = moduleName.slice('react-native/'.length);
    const base = path.join(RN_ROOT, relative);

    const candidates = [
      `${base}.${platform}.js`,
      `${base}.native.js`,
      `${base}.js`,
      path.join(base, 'index.js'),
    ];

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        return { type: 'sourceFile', filePath };
      }
    }
  }

  return context.resolveRequest(context, moduleName, platform);
}

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest: resolveReactNativeInternals,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
