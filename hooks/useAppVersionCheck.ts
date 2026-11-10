import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAppVersion } from '@/hooks/useAppVersion';
import { fetchLatestAppVersion } from '@/services/appManagerService';

const minimumCheckIntervalMs = 60000;

/** One root-level check, shared across login, home, and all other routes. */
export function useAppVersionCheck() {
  const { version: installedVersion } = useAppVersion();
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const dismissedVersions = useRef(new Set<string>());

  useEffect(() => {
    let mounted = true;
    let pending: AbortController | null = null;
    let lastCheckedAt = 0;
    let previousState = AppState.currentState;

    const checkVersion = async () => {
      const now = Date.now();
      if (!mounted || pending !== null || now - lastCheckedAt < minimumCheckIntervalMs) return;
      lastCheckedAt = now;
      const controller = new AbortController();
      pending = controller;
      try {
        const result = await fetchLatestAppVersion(controller.signal);
        if (!mounted || controller.signal.aborted) return;
        if (!result.success || result.version === null) {
          // Offline, malformed replies, and timeouts never block use of the app.
          console.warn('[appManager GETVER] Version check unavailable; app access is unchanged.');
          return;
        }
        const remoteVersion = result.version.trim();
        const currentVersion = installedVersion.trim();
        if (remoteVersion === currentVersion) {
          setLatestVersion(null);
        } else if (!dismissedVersions.current.has(`${currentVersion}|${remoteVersion}`)) {
          setLatestVersion(remoteVersion);
        }
      } finally {
        if (pending === controller) pending = null;
      }
    };

    // Does not wait for authentication and does not delay navigation or rendering.
    void checkVersion();
    const subscription = AppState.addEventListener('change', (nextState) => {
      const returningToApp = nextState === 'active' && previousState !== 'active';
      previousState = nextState;
      if (returningToApp) void checkVersion();
    });

    return () => {
      mounted = false;
      subscription.remove();
      pending?.abort();
    };
  }, [installedVersion]);

  const dismiss = useCallback(() => {
    if (latestVersion !== null) {
      dismissedVersions.current.add(`${installedVersion.trim()}|${latestVersion}`);
    }
    setLatestVersion(null);
  }, [installedVersion, latestVersion]);

  return { installedVersion, latestVersion, dismiss };
}
