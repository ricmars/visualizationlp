import type { ReactNode, Ref } from 'react';

import type { DefaultSettableTheme, FormControlProps, TestIdProp } from '@pega/cosmos-react-core';
import type { TabbedPageTab } from '@pega/cosmos-react-core/lib/components/PageTemplates/PageTemplates';

import { groups, tabs } from './constants';

export type ThemeItemKeys = (
  | 'brandingColor'
  | 'interactiveColor'
  | 'borderColor'
  | 'mainText'
  | 'inputBorder'
  | 'avatarBg'
  | 'link'
  | 'contentBg'
  | 'navBg'
  | 'appHeaderBg'
  | 'pageBg'
  | 'fontFamily'
  | 'cardBorderRadius'
  | 'buttonBorderRadius'
  | 'inputBorderRadius'
  | 'basefont'
  | 'secondaryFillStyle'
  | 'color'
  | 'secondaryColor'
  | 'brandFg'
  | 'buttonFg'
  | 'appHeaderFg'
  | 'navFg'
  | 'caseHeaderFg'
  | 'caseUtilitiesFg'
  | 'caseAssignmentsFg'
  | 'caseStatusCompletedFg'
  | 'caseStatusCurrentFg'
  | 'caseStatusPendingFg'
  | 'cardFg'
  | 'labelFg'
  | 'announcementFg'
  | 'appHeaderBorder'
  | 'navBorder'
  | 'caseHeaderBg'
  | 'caseUtilitiesBg'
  | 'caseAssignmentsBg'
  | 'caseStatusCompletedBg'
  | 'caseStatusCurrentBg'
  | 'caseStatusPendingBg'
  | 'allCards'
  | 'announcementBg'
  | 'pageFg'
)[];

export type GroupKeys = (keyof typeof groups)[];
export type TabKeys = (keyof typeof tabs)[];
export type CustomFontVariables = 'fontFamily' | 'headingFont' | 'brandingFont';

interface PaletteTabRenderers {
  logo?: ReactNode;
  font?: ReactNode;
}

export interface ThemeDesignerProps extends TestIdProp, Pick<ThemePreviewProps, 'previewURL'> {
  name: string;
  theme: DefaultSettableTheme;
  readOnly?: boolean;
  showPreview?: boolean;
  mobileView?: boolean;
  onSave?: (
    options: { name: string; value: boolean | DefaultSettableTheme | string }[],
    cb: () => void,
  ) => void;
  getResetHandler?: (resetFocus: () => void) => void;
  renderers?: PaletteTabRenderers;
  ref?: Ref<HTMLFormElement>;
}

export interface ThemePaletteProps
  extends Pick<FormControlProps, 'readOnly' | 'disabled'>,
    Pick<ThemeDesignerProps, 'getResetHandler' | 'renderers'>,
    TestIdProp {
  name?: string;
  onSave?: (
    data: { theme: DefaultSettableTheme; name?: string; hasWarnings: boolean },
    cb: () => void,
  ) => void;
  tabs?: TabbedPageTab[];
  hiddenItems?: ThemeItemKeys;
  hiddenGroups?: GroupKeys;
  hiddenTabs?: TabKeys;
}

export interface FileReference {
  Type: 'FileReference';
  FileID: string;
  Name: string;
  MimeType?: string;
  Extension?: string;
  Meta: Record<string, string>[];
}

export interface FileURL {
  Type: 'FileURL';
  URL: string;
}
export interface FileItem {
  id: string;
  name: string;
  thumbnail?: string;
  progress?: number;
}

export interface Font {
  name: string;
  resourceType?: 'CSS' | 'WOFF2';
  source?: FileURL['URL'];
}

export type ThemeDesignerStore = {
  name: string;
  theme: Partial<DefaultSettableTheme>;
  font: Font;
  headingFont: Font;
  brandingFont: Font;
  logo: FileItem[] | FileURL['URL'];
  favicon: FileItem[] | FileURL['URL'];
  mobile: {
    splashScreenBackground: string;
    splashScreenImage: FileItem[];
    appIconBackground: string;
    appIcon: FileItem[];
  };
  onUpdate?: (key: 'font' | 'logo' | 'theme', payload?: any) => void;
  readOnly: boolean;
  errors: {
    themeName: boolean;
    logo: Set<string>;
    favicon: Set<string>;
    font: Set<string>;
    headingFont: Set<string>;
    brandingFont: Set<string>;
    mobile: Set<string>;
    style: Record<string, string[]>;
  };
  dirty: boolean;
};

export interface ThemePreviewComponentsProps extends TestIdProp {
  mobileView?: boolean;
}
export interface ThemePreviewProps extends TestIdProp {
  mobileView?: boolean;
  parentHeight?: number;
  portalLogo?: string;
  previewURL?: string;
  ref?: Ref<HTMLIFrameElement>;
}
