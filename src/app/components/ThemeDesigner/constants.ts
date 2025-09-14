import { themeDefinition } from '@pega/cosmos-react-core';
import type { BackgroundPickerProps } from '@pega/cosmos-react-build';
import type { BackgroundType } from '@pega/cosmos-react-build/lib/components/BackgroundPicker/BackgroundPicker.types';
import { supportedBackgroundOptions } from '@pega/cosmos-react-build/lib/components/BackgroundPicker/utils';

export interface FontValue {
  label: string;
  value: string;
  default?: boolean;
}

export type SizeMap = 'None' | 'Small' | 'Medium' | 'Large' | 'Pill';

type SubPaths<T> = T extends object
  ? {
      [K in keyof T]: K extends `$${string}` ? never : K | SubPaths<T[K]>;
    }[keyof T]
  : never;

export interface ThemeItem extends Pick<BackgroundPickerProps, 'backgroundOptions'> {
  label: string;
  name: string;
  parentComponent: keyof typeof themeDefinition;
  path: keyof typeof themeDefinition.base | keyof typeof themeDefinition.components;
  attribute?: string;
  type: 'text' | 'color' | 'select';
  options?: FontValue[] | SizeMap[] | ['Branding', 'Interactive', 'Borders'] | ['Outline', 'Fill'];
  returnType: 'text' | 'number';
  defaultValue?: string;
  dependencies?: ThemeItem[];
  subPaths?: SubPaths<typeof themeDefinition>[];
}

export interface PaletteItems {
  paletteColors: Record<string, Record<string, ThemeItem>>;
  fontFamily: ThemeItem;
  borders: Record<string, ThemeItem>;
  basefont: ThemeItem;
  buttons: Record<string, ThemeItem>;
  sizeMapWithBaseVal: {
    None: number;
    Small: number;
    Medium: number;
    Large: number;
    Pill: number;
  };
}

const borderRadius = 'border-radius';
const backgroundColor = 'background-color';
const background = 'background';
export const option = 'Option';
export const fallBackFonts = "Sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol'";
export const fonts: FontValue[] = [
  {
    label: 'Open Sans',
    value: "'Open Sans', sans-serif",
    default: true,
  },
  {
    label: 'Inter',
    value: 'Inter, sans-serif',
  },
  {
    label: 'Roboto Flex',
    value: "'Roboto Flex', sans-serif",
  },
  {
    label: 'Sans serif',
    value: 'Sans-serif',
  },
  {
    label: 'Serif',
    value: 'Serif',
  },
  {
    label: 'Monospace',
    value: 'Monospace',
  },
  {
    label: 'OS default',
    value:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
  },
  {
    label: 'other',
    value: 'other',
  },
];

const buttonGroupItems: Record<string, ThemeItem> = {
  buttonFg: {
    label: 'Primary button foreground',
    name: 'buttonFg',
    type: 'color',
    parentComponent: 'components',
    path: 'button',
    attribute: 'foreground-color',
    returnType: 'text',
    backgroundOptions: ['automatic', 'solid-color'],
  },
  color: {
    label: 'Primary button background',
    name: 'color',
    type: 'select',
    parentComponent: 'components',
    path: 'button',
    attribute: 'color',
    options: ['Branding', 'Interactive', 'Borders'],
    returnType: 'text',
  },
  secondaryFillStyle: {
    label: 'Secondary button style',
    name: 'secondary-fill-style',
    type: 'select',
    parentComponent: 'components',
    path: 'button',
    attribute: 'secondary-fill-style',
    options: ['Outline', 'Fill'],
    returnType: 'text',
  },
  secondaryColor: {
    label: 'Secondary button color',
    name: 'secondaryColor',
    type: 'select',
    parentComponent: 'components',
    path: 'button',
    attribute: 'secondary-color',
    options: ['Branding', 'Interactive', 'Borders'],
    returnType: 'text',
  },
};

export const ThemeMapping: PaletteItems = {
  paletteColors: {
    mainColors: {
      brandingColor: {
        label: 'Branding',
        name: 'brandingColor',
        type: 'color',
        parentComponent: 'base',
        path: 'palette',
        attribute: 'brand-primary',
        returnType: 'text',
        dependencies: [buttonGroupItems.color, buttonGroupItems.secondaryColor],
        backgroundOptions: ['solid-color'],
      },
      interactiveColor: {
        label: 'Interactive',
        name: 'interactiveColor',
        type: 'color',
        parentComponent: 'base',
        path: 'palette',
        attribute: 'interactive',
        returnType: 'text',
        dependencies: [buttonGroupItems.color, buttonGroupItems.secondaryColor],
        backgroundOptions: ['solid-color'],
      },
      borderColor: {
        label: 'Borders & separators',
        name: 'borders',
        type: 'color',
        parentComponent: 'base',
        path: 'palette',
        attribute: 'border-line',
        returnType: 'text',
        dependencies: [buttonGroupItems.color, buttonGroupItems.secondaryColor],
        backgroundOptions: ['solid-color'],
      },
      pageBg: {
        label: 'App background',
        name: 'pgBackground',
        type: 'color',
        parentComponent: 'base',
        path: 'palette',
        returnType: 'text',
        attribute: 'app-background',
        backgroundOptions: supportedBackgroundOptions.filter((x) => x !== 'automatic'),
      },
      allCards: {
        label: 'Card background',
        name: 'allCards',
        type: 'color',
        parentComponent: 'components',
        path: 'card',
        attribute: background,
        returnType: 'text',
        backgroundOptions: supportedBackgroundOptions.filter((x) => x !== 'automatic'),
      },
      cardFg: {
        label: 'Card foreground',
        name: 'cardFg',
        type: 'color',
        parentComponent: 'components',
        path: 'card',
        attribute: 'foreground-color',
        returnType: 'text',
        backgroundOptions: ['automatic', 'solid-color'],
      },

      labelFg: {
        label: 'Field labels',
        name: 'labelFg',
        type: 'color',
        parentComponent: 'components',
        path: 'label',
        attribute: 'foreground-color',
        returnType: 'text',
        backgroundOptions: ['automatic', 'solid-color'],
      },
      link: {
        label: 'Links',
        name: 'link',
        type: 'color',
        parentComponent: 'components',
        path: 'link',
        attribute: 'color',
        returnType: 'text',
        backgroundOptions: ['solid-color'],
      },
      mainText: {
        label: 'Text',
        name: 'mainText',
        type: 'color',
        parentComponent: 'base',
        path: 'palette',
        attribute: 'foreground-color',
        returnType: 'text',
        backgroundOptions: ['solid-color'],
      },
    },
    supportingColors: {
      inputBorder: {
        label: 'Input borders',
        name: 'inputBorders',
        type: 'color',
        parentComponent: 'components',
        path: 'form-control',
        attribute: 'border-color',
        returnType: 'text',
        backgroundOptions: ['transparent', 'solid-color'],
      },
      avatarBg: {
        label: 'Avatar background',
        name: 'avatarBg',
        type: 'color',
        parentComponent: 'components',
        path: 'avatar',
        attribute: backgroundColor,
        returnType: 'text',
        backgroundOptions: ['transparent', 'solid-color'],
      },
      pageFg: {
        label: 'App foreground',
        name: 'pageFg',
        type: 'color',
        parentComponent: 'base',
        path: 'palette',
        returnType: 'text',
        attribute: 'app-foreground',
        backgroundOptions: ['automatic', 'solid-color'],
      },
      brandFg: {
        label: 'Brand foreground',
        name: 'brandFg',
        type: 'color',
        parentComponent: 'base',
        path: 'palette',
        attribute: 'brand-foreground',
        returnType: 'text',
        backgroundOptions: ['automatic', 'solid-color'],
      },
      buttonFg: {
        label: 'Primary button foreground',
        name: 'buttonFg',
        type: 'color',
        parentComponent: 'components',
        path: 'button',
        attribute: 'foreground-color',
        returnType: 'text',
        backgroundOptions: ['automatic', 'solid-color'],
      },
      appHeaderFg: {
        label: 'App header foreground',
        name: 'appHeaderFg',
        type: 'color',
        parentComponent: 'components',
        path: 'app-shell',
        attribute: 'foreground-color',
        returnType: 'text',
        subPaths: ['header'],
        backgroundOptions: ['automatic', 'solid-color'],
      },
      navFg: {
        label: 'App nav foreground',
        name: 'navFg',
        type: 'color',
        parentComponent: 'components',
        path: 'app-shell',
        attribute: 'foreground-color',
        returnType: 'text',
        subPaths: ['nav'],
        backgroundOptions: ['automatic', 'solid-color'],
      },
      caseHeaderFg: {
        label: 'Summary header foreground',
        name: 'caseHeaderFg',
        type: 'color',
        parentComponent: 'components',
        path: 'case-view',
        attribute: 'foreground-color',
        subPaths: ['header'],
        returnType: 'text',
        backgroundOptions: ['automatic', 'solid-color'],
      },
      caseUtilitiesFg: {
        label: 'Utility panel foreground',
        name: 'caseUtilitiesFg',
        type: 'color',
        parentComponent: 'components',
        path: 'case-view',
        subPaths: ['utilities'],
        attribute: 'foreground-color',
        returnType: 'text',
        backgroundOptions: ['automatic', 'solid-color'],
      },
      caseAssignmentsFg: {
        label: 'Assignments foreground',
        name: 'caseAssignmentsFg',
        type: 'color',
        parentComponent: 'components',
        path: 'case-view',
        subPaths: ['assignments'],
        attribute: 'foreground-color',
        returnType: 'text',
        backgroundOptions: ['automatic', 'solid-color'],
      },
      caseStatusCompletedFg: {
        label: 'Stage complete foreground',
        name: 'caseStatusCompletedFg',
        type: 'color',
        parentComponent: 'components',
        path: 'case-view',
        subPaths: ['stages', 'status', 'completed'],
        attribute: 'foreground-color',
        returnType: 'text',
        backgroundOptions: ['automatic', 'solid-color'],
      },
      caseStatusCurrentFg: {
        label: 'Stage current foreground',
        name: 'caseStatusCurrentFg',
        type: 'color',
        parentComponent: 'components',
        path: 'case-view',
        subPaths: ['stages', 'status', 'current'],
        attribute: 'foreground-color',
        returnType: 'text',
        backgroundOptions: ['automatic', 'solid-color'],
      },
      caseStatusPendingFg: {
        label: 'Stage pending foreground',
        name: 'caseStatusPendingFg',
        type: 'color',
        parentComponent: 'components',
        path: 'case-view',
        subPaths: ['stages', 'status', 'pending'],
        attribute: 'foreground-color',
        returnType: 'text',
        backgroundOptions: ['automatic', 'solid-color'],
      },

      announcementFg: {
        label: 'Announcement widget foreground',
        name: 'announcementFg',
        type: 'color',
        parentComponent: 'components',
        path: 'announcement',
        attribute: 'foreground-color',
        returnType: 'text',
        backgroundOptions: ['automatic', 'solid-color'],
      },
      appHeaderBorder: {
        label: 'App header border',
        name: 'appHeaderBorder',
        type: 'color',
        parentComponent: 'components',
        path: 'app-shell',
        attribute: 'border-color',
        returnType: 'text',
        subPaths: ['header'],
        backgroundOptions: ['transparent', 'solid-color'],
      },
      navBorder: {
        label: 'App nav border',
        name: 'navBorder',
        type: 'color',
        parentComponent: 'components',
        path: 'app-shell',
        attribute: 'border-color',
        returnType: 'text',
        subPaths: ['nav'],
        backgroundOptions: ['transparent', 'solid-color'],
      },
      secondaryBg: {
        label: 'Secondary background',
        name: 'secondaryBg',
        type: 'color',
        parentComponent: 'base',
        path: 'palette',
        attribute: 'secondary-background',
        returnType: 'text',
        backgroundOptions: ['transparent', 'solid-color'],
      },
      appHeaderBg: {
        label: 'App header background',
        name: 'appHeaderBg',
        type: 'color',
        parentComponent: 'components',
        path: 'app-shell',
        subPaths: ['header'],
        attribute: background,
        returnType: 'text',
        backgroundOptions: supportedBackgroundOptions.filter((x) => x !== 'automatic'),
      },
      navBg: {
        label: 'App nav background',
        name: 'navBg',
        type: 'color',
        parentComponent: 'components',
        path: 'app-shell',
        subPaths: ['nav'],
        attribute: background,
        returnType: 'text',
        backgroundOptions: supportedBackgroundOptions.filter(
          (x) => !['automatic', 'transparent'].includes(x),
        ),
      },

      caseHeaderBg: {
        label: 'Summary header background',
        name: 'caseHeaderBg',
        type: 'color',
        parentComponent: 'components',
        path: 'case-view',
        subPaths: ['header'],
        attribute: background,
        returnType: 'text',
        backgroundOptions: supportedBackgroundOptions.filter((x) => x !== 'automatic'),
      },
      caseUtilitiesBg: {
        label: 'Utility panel background',
        name: 'caseUtilitiesBg',
        type: 'color',
        parentComponent: 'components',
        path: 'case-view',
        subPaths: ['utilities'],
        attribute: background,
        returnType: 'text',
        backgroundOptions: supportedBackgroundOptions.filter((x) => x !== 'automatic'),
      },
      caseAssignmentsBg: {
        label: 'Assignments background',
        name: 'caseAssignmentsBg',
        type: 'color',
        parentComponent: 'components',
        path: 'case-view',
        subPaths: ['assignments'],
        attribute: background,
        returnType: 'text',
        backgroundOptions: supportedBackgroundOptions.filter((x) => x !== 'automatic'),
      },
      caseStatusCompletedBg: {
        label: 'Stage complete background',
        name: 'caseStatusCompletedBg',
        type: 'color',
        parentComponent: 'components',
        path: 'case-view',
        subPaths: ['stages', 'status', 'completed'],
        attribute: background,
        returnType: 'text',
        backgroundOptions: supportedBackgroundOptions.filter((x) => x !== 'automatic'),
      },
      caseStatusCurrentBg: {
        label: 'Stage current background',
        name: 'caseStatusCurrentBg',
        type: 'color',
        parentComponent: 'components',
        path: 'case-view',
        subPaths: ['stages', 'status', 'current'],
        attribute: background,
        returnType: 'text',
        backgroundOptions: supportedBackgroundOptions.filter((x) => x !== 'automatic'),
      },
      caseStatusPendingBg: {
        label: 'Stage pending background',
        name: 'caseStatusPendingBg',
        type: 'color',
        parentComponent: 'components',
        path: 'case-view',
        subPaths: ['stages', 'status', 'pending'],
        attribute: background,
        returnType: 'text',
        backgroundOptions: supportedBackgroundOptions.filter((x) => x !== 'automatic'),
      },

      announcementBg: {
        label: 'Announcement widget background',
        name: 'announcementBg',
        type: 'color',
        parentComponent: 'components',
        path: 'announcement',
        attribute: background,
        returnType: 'text',
        backgroundOptions: supportedBackgroundOptions.filter((x) => x !== 'automatic'),
      },
    },
    background: {
      contentBg: {
        label: 'Content',
        name: 'contentBg',
        type: 'color',
        parentComponent: 'base',
        path: 'palette',
        attribute: 'primary-background',
        returnType: 'text',
        backgroundOptions: ['transparent', 'solid-color'],
      },
    },
  },
  fontFamily: {
    label: 'Font family',
    name: 'fontFamily',
    type: 'select',
    parentComponent: 'base',
    path: 'font-family',
    options: fonts,
    returnType: 'text',
  },
  borders: {
    buttonBorderRadius: {
      label: 'Button border radius',
      name: 'buttonBorderRadius',
      returnType: 'number',
      type: 'select',
      options: ['None', 'Small', 'Medium', 'Large', 'Pill'],
      defaultValue: 'Pill',
      parentComponent: 'components',
      path: 'button',
      attribute: borderRadius,
    },
    inputBorderRadius: {
      label: 'Input border radius',
      name: 'inputBorderRadius',
      type: 'select',
      options: ['None', 'Small', 'Medium', 'Large'],
      returnType: 'number',
      defaultValue: 'Medium',
      parentComponent: 'components',
      path: 'form-control',
      attribute: borderRadius,
    },
    cardBorderRadius: {
      label: 'Card border radius',
      name: 'cardBorderRadius',
      returnType: 'text',
      type: 'select',
      parentComponent: 'components',
      options: ['None', 'Small', 'Medium', 'Large'],
      defaultValue: 'Large',
      path: 'card',
      attribute: borderRadius,
    },
  },
  basefont: {
    name: 'Base font',
    type: 'select',
    returnType: 'text',
    parentComponent: 'base',
    path: 'font-size',
    label: 'Base font',
    options: [
      { label: 'Small', value: '0.8125rem' },
      { label: 'Medium', value: '0.875rem' },
      { label: 'Large', value: '1rem' },
    ],
  },
  sizeMapWithBaseVal: {
    None: 0,
    Small: 0.25,
    Medium: 0.5,
    Large: 1,
    Pill: 9999,
  },
  buttons: buttonGroupItems,
};

export type AccessibilityCheckPair = [ThemeItem, ThemeItem, 'AA' | 'AALarge'];

export const AccessibilityDependency: AccessibilityCheckPair[] = [
  [
    ThemeMapping.paletteColors.mainColors.allCards,
    ThemeMapping.paletteColors.mainColors.mainText,
    'AA',
  ],
  [
    ThemeMapping.paletteColors.mainColors.link,
    ThemeMapping.paletteColors.mainColors.allCards,
    'AA',
  ],
  [
    ThemeMapping.paletteColors.mainColors.interactiveColor,
    ThemeMapping.paletteColors.mainColors.allCards,
    'AA',
  ],
  [
    ThemeMapping.paletteColors.mainColors.pageBg,
    ThemeMapping.paletteColors.mainColors.mainText,
    'AA',
  ],
  [
    ThemeMapping.paletteColors.mainColors.interactiveColor,
    ThemeMapping.paletteColors.mainColors.pageBg,
    'AA',
  ],
  [
    ThemeMapping.paletteColors.supportingColors.inputBorder,
    ThemeMapping.paletteColors.mainColors.allCards,
    'AALarge',
  ],
  [ThemeMapping.paletteColors.mainColors.allCards, ThemeMapping.buttons.secondaryColor, 'AA'],
  [ThemeMapping.paletteColors.mainColors.allCards, ThemeMapping.buttons.color, 'AA'],
];

export const errorTokens: Record<string, string> = {
  'App background': 'base.palette.app-background',
  'Card background': 'components.card.background',
  'Input borders': 'components.form-control.border-color',
  'Secondary button color': 'components.button.secondary-color',
  'Primary button background': 'components.button.color',
  Links: 'components.link.color',
  Interactive: 'base.palette.interactive',
  Text: 'base.palette.foreground-color',
};

export const groups = {
  mainColors: 'Primary colors',
  supportingColors: 'Secondary colors',
  background: 'Background',
  buttons: 'Buttons',
  borders: 'Borders',
};

export const tabs = {
  basic: 'Quick settings',
  style: 'Style',
  fonts: 'Fonts',
  logo: 'Logo',
  mobile: 'Mobile',
};

/** Basic tab constants */

export const colorSwatchPalette = [
  { colorName: 'Blue', color: '#005AAE' },
  { colorName: 'Green', color: '#159A89' },
  { colorName: 'Yellow', color: '#CEAA0C' },
  { colorName: 'Orange', color: '#F56015' },
  { colorName: 'Red', color: '#F7060A' },
  { colorName: 'Magenta', color: '#D03895' },
  { colorName: 'Purple', color: '#634CC8' },
  { colorName: 'Gray', color: '#484950' },
];

export const controlTypes = {
  select: 'select',
  combobox: 'combobox',
  backgroundPicker: 'backgroundPicker',
} as const;

export const fontSizeOptions = {
  Small: { value: 's', literalValue: '0.8125rem' },
  Medium: { value: 'm', literalValue: '0.875rem' },
  Large: { value: 'l', literalValue: '1rem' },
} as const;

export const fontOptions = {
  // standard fonts
  'System default': {
    value:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
    category: 'Standard',
  },
  'Open Sans': {
    value: "'Open Sans', sans-serif",
    category: 'Standard',
    default: true,
  },
  Inter: {
    category: 'Standard',
    value: 'Inter, sans-serif',
  },
  'Roboto Flex': {
    category: 'Standard',
    value: "'Roboto Flex', sans-serif",
  },
  'Work Sans': {
    category: 'Standard',
    value: "'Work Sans', sans-serif",
  },
  Montserrat: {
    category: 'Standard',
    value: 'Montserrat, sans-serif',
  },
  Poppins: {
    category: 'Standard',
    value: 'Poppins, sans-serif',
  },
  // Decorative fonts
  Lora: {
    category: 'Decorative',
    value: 'Lora, serif',
  },
  Playfair: {
    category: 'Decorative',
    value: "'Playfair', serif",
  },
  'Roboto Slab': {
    category: 'Decorative',
    value: "'Roboto Slab', serif",
  },
  'Roboto Mono': {
    category: 'Decorative',
    value: "'Roboto Mono', monospace",
  },
  // Custom fonts
  Custom: {
    category: 'Custom',
    value: 'other',
  },
  'Use default': {
    category: 'Default',
    value: 'default',
  },
} as const;

export const borderRadiusOptions = {
  'Use default': { value: 'default', icon: 'rounded-none' },
  None: { value: 0, icon: 'rounded-none' },
  Small: { value: 0.25, icon: 'rounded-small' },
  Medium: { value: 0.5, icon: 'rounded-medium' },
  Large: { value: 1, icon: 'rounded-large' },
  'Extra large': { value: 2, icon: 'rounded-extra-large' },
  Pill: { value: 9999, icon: 'rounded-pill' },
} as const;

export const spacingOptions = {
  Condensed: { value: '0.35rem', icon: 'spacing-condensed' },
  Standard: { value: '0.5rem', icon: 'spacing-standard' },
  Expanded: { value: '0.65rem', icon: 'spacing-expanded' },
} as const;

export const layoutOptions = {
  Connected: {
    value: 'false',
    icon: 'layout-connected',
  },
  Detached: {
    value: 'true',
    icon: 'layout-detached',
  },
} as const;

export const tabLayoutOptions = {
  Block: {
    value: 'false',
    icon: 'layout-connected',
  },
  Wrapped: {
    value: 'true',
    icon: 'layout-detached',
  },
} as const;

export const fvlLayoutOptions = {
  'No separators': {
    value: 'false',
    icon: 'layout-connected',
  },
  Separators: {
    value: 'true',
    icon: 'layout-detached',
  },
} as const;

export type ControlTypeKey = keyof typeof controlTypes;
export type FontSizeOptionsKey = keyof typeof fontSizeOptions;
export type BorderRadiusOptionKey = keyof typeof borderRadiusOptions;
export type SpacingOptionKey = keyof typeof spacingOptions;
export type FontOptionKey = keyof typeof fontOptions;
export type LayoutOptionKey = keyof typeof layoutOptions;
export type TabLayoutOptionKey = keyof typeof tabLayoutOptions;
export type FvlLayoutOptionKey = keyof typeof fvlLayoutOptions;

export type SelectInputOptionKey =
  | FontSizeOptionsKey
  | FontOptionKey
  | BorderRadiusOptionKey
  | SpacingOptionKey
  | LayoutOptionKey
  | TabLayoutOptionKey
  | FvlLayoutOptionKey;

export interface SelectInputConfig {
  controlType: 'select' | 'combobox';
  config: {
    options: SelectInputOptionKey[];
  };
}

/**
 * Configuration for a color input field.
 */
export interface ColorInputConfig {
  /**
   * The type of control to use for the color input.
   */
  controlType: 'backgroundPicker';
  /**
   * Configuration options specific to the color input.
   */
  config: {
    /**
     * Whether to display color swatches for quick selection.
     */
    showColorSwatches: boolean;
    /**
     * Available options for the color input.
     */
    options: BackgroundType[];
  };
}

/**
 * Represents a theme item configuration.
 */
export interface BasicThemeItem {
  /**
   * The label to display for the theme item in the UI.
   */
  label: string;
  /**
   * The name of the theme item, used for identification.
   */
  name: string;
  /**
   * The full token path within the theme object (e.g., 'root: base.palette' or 'components.app-shell.nav').
   */
  tokenPath: string;
  /**
   * The specific token to update within the token path (e.g., 'primary', 'background').
   */
  token: string;
  /**
   * The default value for the theme item.
   */
  defaultValue?: string;
  /**
   * Configuration for the input control used to modify the theme item.
   */
  inputControl: SelectInputConfig | ColorInputConfig;
  /**
   * An optional array of other token paths (including the token name) that should be updated when this theme item is modified.
   */
  otherTokensToUpdate?: string[];
  /**
   * Whether the theme item should be expanded by default.
   */
  defaultExpanded?: boolean;
  /**
   * Whether the theme item should be hidden in UI.
   */
  hidden?: boolean;
}

export interface ThemeItemsGroup {
  /**
   * Optional label for the group of theme items.
   */
  label?: string;
  expanded?: boolean;
  items: Record<string, BasicThemeItem>;
}

/**
 * Full theme mapping configuration.
 */
export const basicThemeMapping: Record<string, ThemeItemsGroup> = {
  brandColorGroup: {
    items: {
      branding: {
        label: 'Brand color',
        name: 'brandColor',
        tokenPath: 'base.palette',
        token: 'brand-primary',
        defaultValue: '#0070f3',
        inputControl: {
          controlType: 'backgroundPicker',
          config: {
            showColorSwatches: true,
            options: ['solid-color'],
          } as ColorInputConfig['config'],
        },
        otherTokensToUpdate: [
          'base.palette.interactive',
          'components.button.color',
          'components.button.secondary-color',
          'components.link.color',
          'components.case-view.header.background',
          'components.case-view.stages.status.current.background',
          'components.announcement.background',
        ],
        defaultExpanded: true,
      },
    },
  },
  fontGroup: {
    label: 'Font',
    expanded: false,
    items: {
      fontSize: {
        label: 'Size',
        name: 'Size',
        tokenPath: 'base',
        token: 'font-size',
        defaultValue: 'm',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: ['Small', 'Medium', 'Large'],
          },
        },
        otherTokensToUpdate: [
          'components.text.primary.font-size',
          'components.text.secondary.font-size',
          'components.app-shell.header.brand-text-primary.font-size',
          'components.app-shell.header.brand-text-secondary.font-size',
        ],
        defaultExpanded: true,
      },
      fontFamily: {
        label: 'Default',
        name: 'default',
        tokenPath: 'base',
        token: 'font-family',
        defaultValue: 'Roboto Flex',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(fontOptions).filter(
              (x) => !['Playfair', 'Lora', 'Use default'].includes(x),
            ) as FontOptionKey[],
          },
        },
        otherTokensToUpdate: [
          'components.text.primary.font-family',
          'components.text.secondary.font-family',
          'components.text.h1.font-family',
          'components.text.h2.font-family',
          'components.text.h3.font-family',
          'components.text.h4.font-family',
          'components.text.h5.font-family',
          'components.text.h6.font-family',
          'components.text.brand-primary.font-family',
          'components.label.font-family',
        ],
        defaultExpanded: true,
      },
      brandingFont: {
        label: 'App header',
        name: 'App header',
        tokenPath: 'components.text.brand-primary',
        token: 'font-family',
        defaultValue: 'Roboto Flex',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(fontOptions) as FontOptionKey[],
          },
        },
        otherTokensToUpdate: [],
      },
      headingFont: {
        label: 'Headings',
        name: 'Headings',
        tokenPath: 'components.text.h1',
        token: 'font-family',
        defaultValue: 'Roboto Flex',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(fontOptions) as FontOptionKey[],
          },
        },
        otherTokensToUpdate: [
          'components.text.h1.font-family',
          'components.text.h2.font-family',
          'components.text.h3.font-family',
          'components.text.h4.font-family',
          'components.text.h5.font-family',
          'components.text.h6.font-family',
        ],
      },
    },
  },
  pageLayoutStyleGroup: {
    label: 'Page style',
    items: {
      tabsLayoutStyle: {
        label: 'Tab style',
        name: 'tabsLayoutStyle',
        tokenPath: 'components.tabs',
        token: 'detached',
        defaultValue: 'false',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(tabLayoutOptions) as TabLayoutOptionKey[],
          },
        },
        otherTokensToUpdate: [],
        defaultExpanded: true,
      },
      fvlLayoutStyle: {
        label: 'Field value list style',
        name: 'fvlLayoutStyle',
        tokenPath: 'components.field-value-list.inline',
        token: 'detached',
        defaultValue: 'false',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(fvlLayoutOptions) as FvlLayoutOptionKey[],
          },
        },
        otherTokensToUpdate: [],
        defaultExpanded: true,
      },
      pageLayoutStyle: {
        label: 'Default',
        name: 'pageLayoutStyle',
        tokenPath: 'components.app-shell.nav',
        token: 'detached',
        defaultValue: 'false',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(layoutOptions) as LayoutOptionKey[],
          },
        },
        otherTokensToUpdate: [
          'components.case-view.summary.detached',
          'components.case-view.utilities.detached',
          'components.case-view.assignments.detached',
        ],
        defaultExpanded: true,
      },
      navLayoutStyle: {
        label: 'Navigation options',
        name: 'navLayoutStyle',
        tokenPath: 'components.app-shell.nav',
        token: 'detached',
        defaultValue: 'false',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(layoutOptions) as LayoutOptionKey[],
          },
        },
        otherTokensToUpdate: [],
      },
      summaryLayoutStyle: {
        label: 'Summary panel',
        name: 'summaryLayoutStyle',
        tokenPath: 'components.case-view.summary',
        token: 'detached',
        defaultValue: 'false',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(layoutOptions) as LayoutOptionKey[],
          },
        },
        otherTokensToUpdate: [],
      },
      utilitiesLayoutStyle: {
        label: 'Utility panel',
        name: 'summaryLayoutStyle',
        tokenPath: 'components.case-view.utilities',
        token: 'detached',
        defaultValue: 'false',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(layoutOptions) as LayoutOptionKey[],
          },
        },
        otherTokensToUpdate: [],
      },
      assignmentLayoutStyle: {
        label: 'Assignments',
        name: 'assignmentLayoutStyle',
        tokenPath: 'components.case-view.assignments',
        token: 'detached',
        defaultValue: 'false',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(layoutOptions) as LayoutOptionKey[],
          },
        },
        otherTokensToUpdate: [],
      },
    },
  },
  roundCornersGroup: {
    label: 'Corners',
    items: {
      roundCorners: {
        label: 'Default',
        name: 'roundCorners',
        tokenPath: 'base',
        token: 'border-radius',
        defaultValue: '.5rem',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(borderRadiusOptions).filter(
              (x) => !['Use default', 'None', 'Pill'].includes(x),
            ) as BorderRadiusOptionKey[],
          },
        },
        otherTokensToUpdate: [
          'components.card.border-radius',
          'components.button.border-radius',
          'components.form-control.border-radius',
        ],
        defaultExpanded: true,
      },
      buttonRoundCorners: {
        label: 'Buttons',
        name: 'buttonRoundCorners',
        tokenPath: 'components.button',
        token: 'border-radius',
        defaultValue: '.5rem',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(borderRadiusOptions) as BorderRadiusOptionKey[],
          },
        },
        otherTokensToUpdate: [],
      },
      inputRoundCorners: {
        label: 'Inputs',
        name: 'inputsRoundCorners',
        tokenPath: 'components.form-control',
        token: 'border-radius',
        defaultValue: '.5rem',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(borderRadiusOptions) as BorderRadiusOptionKey[],
          },
        },
        otherTokensToUpdate: [],
      },
      cardRoundCorners: {
        label: 'Cards',
        name: 'cardRoundCorners',
        tokenPath: 'components.card',
        token: 'border-radius',
        defaultValue: '.5rem',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(borderRadiusOptions).filter(
              (x) => x !== 'Pill',
            ) as BorderRadiusOptionKey[],
          },
        },
        otherTokensToUpdate: [],
        hidden: true,
      },
    },
  },
  spacingGroup: {
    items: {
      spacing: {
        label: 'Whitespace',
        name: 'spacing',
        tokenPath: 'base',
        token: 'spacing',
        defaultValue: '0.5rem',
        inputControl: {
          controlType: 'combobox',
          config: {
            options: Object.keys(spacingOptions) as SpacingOptionKey[],
          },
        },
        otherTokensToUpdate: [],
        defaultExpanded: true,
      },
    },
  },
};
