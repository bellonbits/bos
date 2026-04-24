// Ant Design 5 theme tokens — Biashara OS brand
import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    // Brand colors
    colorPrimary: '#0F4C81',
    colorSuccess: '#27AE60',
    colorWarning: '#F39C12',
    colorError: '#E74C3C',
    colorInfo: '#2980B9',

    // Typography
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeXL: 20,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,

    // Layout
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,

    // Spacing
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,

    // Colors
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F5F7FA',
    colorBorder: '#E2E8F0',
    colorTextSecondary: '#4A5568',

    // Motion — slightly reduced for a business tool
    motionDurationMid: '0.15s',
    motionDurationSlow: '0.25s',

    // Shadows
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    boxShadowSecondary: '0 4px 12px rgba(0,0,0,0.08)',
  },
  components: {
    Layout: {
      siderBg: '#0F4C81',
      triggerBg: '#0A3D6B',
      bodyBg: '#F5F7FA',
    },
    Menu: {
      darkItemBg: '#0F4C81',
      darkSubMenuItemBg: '#0A3D6B',
      darkItemSelectedBg: '#E8B31A',
      darkItemSelectedColor: '#0F4C81',
      darkItemColor: 'rgba(255,255,255,0.85)',
      darkItemHoverColor: '#FFFFFF',
      darkItemHoverBg: 'rgba(255,255,255,0.1)',
    },
    Card: {
      headerBg: 'transparent',
    },
    Table: {
      headerBg: '#F8FAFC',
      rowHoverBg: '#F0F7FF',
    },
    Button: {
      paddingInlineLG: 24,
    },
    Statistic: {
      titleFontSize: 13,
    },
  },
};

// Design tokens used in custom components (Base UI, CSS)
export const tokens = {
  primary: '#0F4C81',
  primaryHover: '#1A6BB5',
  primaryLight: '#EBF3FA',
  accent: '#E8B31A',
  success: '#27AE60',
  successLight: '#E8F8EE',
  danger: '#E74C3C',
  dangerLight: '#FEE8E7',
  warning: '#F39C12',
  warningLight: '#FEF3E0',
  mpesa: '#00A651',
  mpesaLight: '#E6F7EE',
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#1A202C',
  textSecondary: '#4A5568',
  textMuted: '#A0AEC0',
} as const;

export const glassTokens = {
  bg: 'rgba(255, 255, 255, 0.05)',
  bgMedium: 'rgba(255, 255, 255, 0.1)',
  bgHeavy: 'rgba(255, 255, 255, 0.18)',
  bgDark: 'rgba(0, 0, 0, 0.35)',
  border: 'rgba(255, 255, 255, 0.1)',
  borderMedium: 'rgba(255, 255, 255, 0.18)',
  blur: '24px',
  shadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
} as const;

export const darkTokens = {
  sidebarBg: '#1E3944', // Cactus Deep Teal
  sidebarItemActive: 'rgba(255, 255, 255, 0.12)',
  headerBg: '#FFFFFF',
  textMain: '#1E293B',
  textMuted: '#64748B',
  accent: '#38BDF8', 
} as const;

export const cactusTheme = {
  bg: '#F8FAFC',
  cardBg: '#FFFFFF',
  sidebar: '#2D4B54',
  accent: '#10B981', // Green for income
  expense: '#F43F5E', // Red for expense
  border: '#E2E8F0',
} as const;



