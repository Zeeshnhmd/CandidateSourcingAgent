/**
 * Design tokens. Ant Design reads these through `antdTheme.ts`; Tailwind mirrors the same values
 * as CSS variables in `styles.css`. Change a colour in both places.
 */
export const colors = {
  primary: '#4F46E5',
  primaryHover: '#4338CA',
  primaryActive: '#3730A3',
  primarySoft: '#EEF2FF',
  primaryMuted: '#E0E7FF',
  primaryLine: '#C7D2FE',

  ink: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  dim: '#94A3B8',
  line: '#E2E8F0',
  lineSoft: '#EEF1F5',
  canvas: '#F8FAFC',
  surface: '#FFFFFF',
  subtle: '#F1F5F9',

  sidebar: '#0B0F1E',

  success: '#16A34A',
  successSoft: '#F0FDF4',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  info: '#0284C7',
  infoSoft: '#F0F9FF',
} as const;

export const fonts = {
  sans: "'Inter Variable', Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
} as const;
