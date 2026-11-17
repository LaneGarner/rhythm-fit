const { withXcodeProject } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');
const plist = require('@expo/plist').default;

const targetName = 'RhythmWatch';
const entitlements = { 'com.apple.developer.healthkit': true };

module.exports = function withWatchWorkout(config) {
  const phoneBundleId = config.ios.bundleIdentifier;
  const bundleIdentifier = `${phoneBundleId}.watchkitapp`;
  const version = config.version;
  config.extra ??= {};
  config.extra.eas ??= {};
  config.extra.eas.build ??= {};
  config.extra.eas.build.experimental ??= {};
  const experimental = config.extra.eas.build.experimental;
  experimental.ios ??= {};
  const extensions = experimental.ios.appExtensions ?? [];
  experimental.ios.appExtensions = [
    ...extensions.filter(target => target.targetName !== targetName),
    { targetName, bundleIdentifier, entitlements },
  ];

  return withXcodeProject(config, config => {
    const { projectRoot, platformProjectRoot } = config.modRequest;
    const source = path.join(projectRoot, 'targets/watch');
    const directory = path.join(platformProjectRoot, targetName);
    fs.mkdirSync(directory, { recursive: true });
    fs.copyFileSync(
      path.join(source, 'RhythmWatchApp.swift'),
      path.join(directory, 'RhythmWatchApp.swift')
    );
    fs.copyFileSync(
      path.join(projectRoot, 'assets/icon.png'),
      path.join(directory, 'RhythmMark.png')
    );

    const iconSet = path.join(directory, 'Assets.xcassets/AppIcon.appiconset');
    fs.mkdirSync(iconSet, { recursive: true });
    fs.copyFileSync(
      path.join(projectRoot, 'assets/icon.png'),
      path.join(iconSet, 'AppIcon.png')
    );
    fs.writeFileSync(
      path.join(iconSet, 'Contents.json'),
      JSON.stringify({
        images: [
          {
            filename: 'AppIcon.png',
            idiom: 'universal',
            platform: 'watchos',
            size: '1024x1024',
          },
        ],
        info: { author: 'xcode', version: 1 },
      })
    );
    const info = plist.parse(
      fs.readFileSync(path.join(source, 'Info.plist'), 'utf8')
    );
    delete info.CFBundleSupportedPlatforms;
    delete info.MinimumOSVersion;
    delete info.UIDeviceFamily;
    info.CFBundleIdentifier = '$(PRODUCT_BUNDLE_IDENTIFIER)';
    info.CFBundleExecutable = '$(EXECUTABLE_NAME)';
    info.CFBundleShortVersionString = '$(MARKETING_VERSION)';
    info.CFBundleVersion = '$(CURRENT_PROJECT_VERSION)';
    info.WKCompanionAppBundleIdentifier = phoneBundleId;
    fs.writeFileSync(path.join(directory, 'Info.plist'), plist.build(info));
    fs.writeFileSync(
      path.join(directory, 'RhythmWatch.entitlements'),
      plist.build(entitlements)
    );

    const project = config.modResults;
    const objects = project.hash.project.objects;
    objects.PBXTargetDependency ??= {};
    objects.PBXContainerItemProxy ??= {};
    let watchTarget =
      project.pbxTargetByName(targetName) ??
      project.pbxTargetByName('"RhythmWatch"');
    if (!watchTarget) {
      const target = project.addTarget(
        targetName,
        'watch2_app',
        targetName,
        bundleIdentifier
      );
      // watchOS 9+ apps use the application product type and contain their Swift executable.
      watchTarget = target.pbxNativeTarget;
      target.pbxNativeTarget.productType =
        '"com.apple.product-type.application"';
      project.addBuildPhase(
        [`${targetName}/RhythmWatchApp.swift`],
        'PBXSourcesBuildPhase',
        'Sources',
        target.uuid
      );
      project.addBuildPhase(
        [`${targetName}/RhythmMark.png`, `${targetName}/Assets.xcassets`],
        'PBXResourcesBuildPhase',
        'Resources',
        target.uuid
      );
    }

    const configs =
      project.pbxXCConfigurationList()[watchTarget.buildConfigurationList];
    const { uuid: phoneId, firstTarget: phone } = project.getFirstTarget();
    const watchId =
      project.findTargetKey(targetName) ??
      project.findTargetKey(`"${targetName}"`);
    if (
      !phone.dependencies.some(
        ({ value }) => objects.PBXTargetDependency[value]?.target === watchId
      )
    ) {
      project.addTargetDependency(phoneId, [watchId]);
    }
    const phoneConfigs =
      project.pbxXCConfigurationList()[phone.buildConfigurationList];
    const buildConfigs = project.pbxXCBuildConfigurationSection();
    for (const entry of configs.buildConfigurations) {
      const build = buildConfigs[entry.value];
      const phoneEntry = phoneConfigs.buildConfigurations.find(
        entry => buildConfigs[entry.value].name === build.name
      );
      const phoneSettings = buildConfigs[phoneEntry.value].buildSettings;
      Object.assign(build.buildSettings, {
        SDKROOT: 'watchos',
        SUPPORTED_PLATFORMS: '"watchos watchsimulator"',
        TARGETED_DEVICE_FAMILY: '4',
        WATCHOS_DEPLOYMENT_TARGET: '10.0',
        SWIFT_VERSION: '5.0',
        MARKETING_VERSION: version,
        CURRENT_PROJECT_VERSION: phoneSettings.CURRENT_PROJECT_VERSION || '1',
        INFOPLIST_FILE: `${targetName}/Info.plist`,
        CODE_SIGN_ENTITLEMENTS: `${targetName}/RhythmWatch.entitlements`,
        ASSETCATALOG_COMPILER_APPICON_NAME: 'AppIcon',
        SKIP_INSTALL: 'YES',
      });
    }
    return config;
  });
};
