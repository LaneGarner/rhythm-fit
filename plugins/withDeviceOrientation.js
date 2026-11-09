const {
  withInfoPlist,
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// Keep the phone restriction native so it applies before JavaScript loads.
module.exports = function withDeviceOrientation(config) {
  config = withInfoPlist(config, config => {
    config.modResults.UISupportedInterfaceOrientations = [
      'UIInterfaceOrientationPortrait',
    ];
    config.modResults['UISupportedInterfaceOrientations~ipad'] = [
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationPortraitUpsideDown',
      'UIInterfaceOrientationLandscapeLeft',
      'UIInterfaceOrientationLandscapeRight',
    ];
    return config;
  });
  config = withAndroidManifest(config, config => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(
      config.modResults
    );
    activity.$['android:screenOrientation'] =
      '@integer/rhythm_screen_orientation';
    return config;
  });
  return withDangerousMod(config, [
    'android',
    async config => {
      for (const [directory, value] of [
        ['values', 1],
        ['values-sw600dp', -1],
      ]) {
        const folder = path.join(
          config.modRequest.platformProjectRoot,
          'app/src/main/res',
          directory
        );
        await fs.mkdir(folder, { recursive: true });
        await fs.writeFile(
          path.join(folder, 'rhythm_orientation.xml'),
          `<?xml version="1.0" encoding="utf-8"?>\n<resources><integer name="rhythm_screen_orientation">${value}</integer></resources>\n`
        );
      }
      return config;
    },
  ]);
};
