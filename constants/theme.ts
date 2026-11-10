// Design tokens for Quiz App
export const Colors = {
  // Base
  background: '#FDFEF6',
  surface: '#F4F5EC',
  surfaceElevated: '#EAECDF',
  surfaceBorder: '#D8DAC8',
  paymentQrSurface: '#FFFFFF',

  // Brand
  primary: '#C9920A',
  primaryLight: '#F5C842',
  primaryDark: '#9A6F05',

  // Accent
  accent: '#2D6DE0',
  accentLight: '#5B8DEF',

  // Semantic
  success: '#2E8A60',
  successBg: 'rgba(46, 138, 96, 0.12)',
  error: '#C0392B',
  errorBg: 'rgba(192, 57, 43, 0.12)',
  warning: '#C97A10',
  warningBg: 'rgba(201, 122, 16, 0.12)',

  // Text
  textPrimary: '#1A1C14',
  textSecondary: '#4A4D38',
  textMuted: '#8A8D72',
  textOnPrimary: '#FDFEF6',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.4)',
  tooltipBackground: '#1A237E',
  tooltipText: '#FFFFFF',
  transparent: 'transparent',
};

export const Typography = {
  // Sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,

  // Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Large preserves the app's original text size; each tap steps down once.
export const FontScale = {
  large: 1.2,
  medium: 1.1,
  small: 1,
} as const;

export const FontSizeLabels = {
  large: '大',
  medium: '中',
  small: '小',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: '#A0A080',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#C9920A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
};
