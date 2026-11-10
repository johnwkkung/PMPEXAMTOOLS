import { useContext } from 'react';
import { FontSizeContext } from '@/contexts/FontSizeContext';
import { FontScale, FontSizeLabels } from '@/constants/theme';

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) throw new Error('useFontSize must be used within FontSizeProvider');
  const nextLevel = context.level === 'large' ? 'medium' : context.level === 'medium' ? 'small' : 'large';
  return {
    ...context,
    levelLabel: FontSizeLabels[context.level],
    nextLevelLabel: FontSizeLabels[nextLevel],
    // Screens that previously used fixed text keep their original default appearance.
    relativeScale: context.multiplier / FontScale.large,
  };
}
