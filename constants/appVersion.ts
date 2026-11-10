import appConfig from '../app.json';

interface VersionConfig {
  version?: string;
  ios?: { bundleIdentifier?: string; buildNumber?: string };
  android?: { package?: string; versionCode?: number };
}

// app.json is the single source of truth for configured release metadata.
// Native builds read their installed version instead; previews use this fallback.
const config: VersionConfig = appConfig.expo;

export const AppVersionConfig = {
  version: config.version ?? '1.0.0',
  iosApplicationId: config.ios?.bundleIdentifier ?? null,
  androidApplicationId: config.android?.package ?? null,
  iosBuildNumber: config.ios?.buildNumber ?? null,
  androidBuildNumber: config.android?.versionCode?.toString() ?? null,
} as const;
