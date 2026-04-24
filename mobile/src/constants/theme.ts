export const Colors = {
  primary: '#0F4C81',       // Deep blue — trust, Kenya flag blue
  primaryLight: '#1A6BB5',
  primaryDark: '#093A63',
  accent: '#E8B31A',        // Gold — prosperity
  accentLight: '#F0CC5A',
  success: '#27AE60',
  successLight: '#E8F8EE',
  danger: '#E74C3C',
  dangerLight: '#FEE8E7',
  warning: '#F39C12',
  warningLight: '#FEF3E0',
  info: '#2980B9',
  infoLight: '#EBF5FB',

  // Neutrals
  background: '#F5F7FA',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  text: '#1A202C',
  textSecondary: '#4A5568',
  textMuted: '#A0AEC0',
  textInverse: '#FFFFFF',

  // M-Pesa green
  mpesa: '#00A651',
  mpesaLight: '#E6F7EE',
  cash: '#0F4C81',
  cashLight: '#EBF3FA',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 36,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};
