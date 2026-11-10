import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { FontScale } from '@/constants/theme';

export type FontSizeLevel = keyof typeof FontScale;

interface FontSizeContextType {
  level: FontSizeLevel;
  multiplier: number;
  setLevel: (level: FontSizeLevel) => void;
  cycleLevel: () => void;
  fs: (size: number) => number;
}

export const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState<FontSizeLevel>('large');
  const multiplier = FontScale[level];
  const cycleLevel = useCallback(() => {
    setLevel((current) => current === 'large' ? 'medium' : current === 'medium' ? 'small' : 'large');
  }, []);
  const fs = useCallback((size: number) => Math.max(1, Math.round(size * multiplier)), [multiplier]);
  const value = useMemo(() => ({ level, multiplier, setLevel, cycleLevel, fs }), [level, multiplier, cycleLevel, fs]);

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  );
}
