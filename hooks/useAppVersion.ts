import { useMemo } from 'react';
import { getAppVersionInfo } from '@/services/appVersionService';

export function useAppVersion() {
  return useMemo(() => {
    const info = getAppVersionInfo();
    return {
      ...info,
      label: `版本 ${info.version}`,
    };
  }, []);
}
