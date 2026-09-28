import { Check, ChevronDown, X } from 'lucide-react';
import type { ConfigProviderProps, ThemeConfig } from 'antd';
import { colors, fonts } from './tokens';

const theme: ThemeConfig = {
  token: {
    colorPrimary: colors.primary,
    colorPrimaryHover: colors.primaryHover,
    colorPrimaryActive: colors.primaryActive,
    colorPrimaryBg: colors.primarySoft,
    colorPrimaryBgHover: colors.primaryMuted,
    colorPrimaryBorder: colors.primaryLine,
    colorInfo: colors.info,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.danger,
    colorLink: colors.primary,
    colorLinkHover: colors.primaryHover,

    colorText: colors.ink,
    colorTextSecondary: colors.muted,
    colorTextTertiary: colors.dim,
    colorTextDescription: colors.muted,
    colorTextPlaceholder: colors.dim,
    colorBorder: colors.line,
    colorBorderSecondary: colors.lineSoft,
    colorBgLayout: colors.canvas,
    colorBgContainer: colors.surface,
    colorFillAlter: colors.canvas,
    colorFillSecondary: colors.subtle,

    fontFamily: fonts.sans,
    fontFamilyCode: fonts.mono,
    fontSize: 14,
    fontWeightStrong: 600,

    borderRadius: 6,
    borderRadiusSM: 4,
    borderRadiusLG: 10,
    controlHeight: 36,
    controlHeightSM: 28,
    controlHeightLG: 40,
    controlOutlineWidth: 3,
    controlOutline: 'rgba(79, 70, 229, 0.12)',

    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    boxShadowSecondary: '0 12px 32px -12px rgba(15, 23, 42, 0.18), 0 2px 6px -2px rgba(15, 23, 42, 0.06)',
    motionDurationMid: '0.18s',
  },
  components: {
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      fontWeight: 500,
      borderRadius: 8,
      borderRadiusLG: 8,
      defaultBorderColor: colors.line,
      defaultHoverBorderColor: colors.dim,
      defaultHoverColor: colors.ink,
      defaultHoverBg: colors.canvas,
    },
    Input: {
      paddingInline: 12,
      hoverBorderColor: colors.dim,
      activeShadow: '0 0 0 3px rgba(79, 70, 229, 0.12)',
    },
    InputNumber: {
      hoverBorderColor: colors.dim,
      activeShadow: '0 0 0 3px rgba(79, 70, 229, 0.12)',
    },
    Select: {
      hoverBorderColor: colors.dim,
      activeOutlineColor: 'rgba(79, 70, 229, 0.12)',
      optionHeight: 34,
      optionPadding: '7px 10px',
      optionSelectedBg: colors.primarySoft,
      optionSelectedColor: colors.primary,
      optionSelectedFontWeight: 500,
      optionActiveBg: colors.canvas,
      multipleItemBg: colors.primarySoft,
      multipleItemBorderColor: colors.primaryLine,
      multipleItemHeight: 24,
    },
    Form: {
      labelFontSize: 13,
      labelColor: colors.body,
      verticalLabelPadding: '0 0 6px',
      itemMarginBottom: 18,
    },
    Tag: {
      defaultBg: colors.surface,
      defaultColor: colors.body,
      borderRadiusSM: 6,
      fontSizeSM: 12,
    },
    Drawer: {
      colorBgElevated: colors.surface,
    },
    Dropdown: {
      borderRadiusLG: 10,
      controlItemBgHover: colors.canvas,
      controlItemBgActive: colors.primarySoft,
    },
    Tooltip: {
      colorBgSpotlight: colors.ink,
      borderRadius: 6,
    },
    Segmented: {
      itemSelectedColor: colors.ink,
      trackBg: colors.subtle,
      trackPadding: 3,
    },
    Switch: {
      trackHeight: 20,
      trackMinWidth: 36,
      handleSize: 16,
    },
    Alert: {
      borderRadiusLG: 10,
    },
    Popover: {
      borderRadiusLG: 12,
    },
  },
};

/** App-wide Ant Design configuration: theme tokens plus shared icons and component defaults. */
export const antdConfig: ConfigProviderProps = {
  theme,
  select: {
    suffixIcon: <ChevronDown size={16} strokeWidth={2} aria-hidden className="csa-select-chevron text-dim" />,
    removeIcon: <X size={12} strokeWidth={2.25} aria-hidden />,
    menuItemSelectedIcon: <Check size={14} strokeWidth={2.25} aria-hidden className="text-primary" />,
  },
  tag: { variant: 'outlined' },
  drawer: { closeIcon: <X size={18} aria-hidden /> },
};
