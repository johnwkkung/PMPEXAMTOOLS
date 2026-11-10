import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { AppVersionConfig } from '@/constants/appVersion';

export interface AppVersionInfo {
  version: string;
  buildNumber: string | null;
  isPreview: boolean;
}

export function getAppVersionInfo(): AppVersionInfo {
  const expectedId = Platform.OS === 'ios'
    ? AppVersionConfig.iosApplicationId
    : Platform.OS === 'android'
      ? AppVersionConfig.androidApplicationId
      : null;
  // Never present the Expo/OnSpace preview host's version as this app's version.
  const isOwnNativeApp = Platform.OS !== 'web'
    && expectedId !== null
    && Application.applicationId === expectedId
    && Boolean(Application.nativeApplicationVersion);

  if (isOwnNativeApp) {
    return {
      version: Application.nativeApplicationVersion ?? AppVersionConfig.version,
      buildNumber: Application.nativeBuildVersion,
      isPreview: false,
    };
  }

  return {
    version: AppVersionConfig.version,
    buildNumber: Platform.OS === 'ios'
      ? AppVersionConfig.iosBuildNumber
      : Platform.OS === 'android'
        ? AppVersionConfig.androidBuildNumber
        : null,
    isPreview: true,
  };
}
