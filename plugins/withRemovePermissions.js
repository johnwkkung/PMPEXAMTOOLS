/**
 * Config plugin to remove specific Android permissions that are
 * automatically injected by third-party libraries.
 *
 * Usage in app.json:
 *   "plugins": ["./plugins/withRemovePermissions"]
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSIONS_TO_REMOVE = [
  'android.permission.ACTIVITY_RECOGNITION',
];

module.exports = function withRemovePermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = manifest['uses-permission'].filter((perm) => {
        const name = perm?.$?.['android:name'];
        return !PERMISSIONS_TO_REMOVE.includes(name);
      });
    }

    return config;
  });
};
