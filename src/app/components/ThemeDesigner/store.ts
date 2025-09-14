import { createSimpleStore } from '@pega/cosmos-react-core';

import type { ThemeDesignerStore } from './ThemeDesigner.types';

export const defaultStoreValue: ThemeDesignerStore = {
  name: '',
  logo: [],
  favicon: [],
  theme: {},
  font: { name: '' },
  headingFont: { name: '' },
  brandingFont: { name: '' },
  mobile: {
    splashScreenBackground: '',
    splashScreenImage: [],
    appIconBackground: '',
    appIcon: [],
  },
  readOnly: false,
  errors: {
    themeName: false,
    font: new Set<string>(),
    headingFont: new Set<string>(),
    brandingFont: new Set<string>(),
    logo: new Set<string>(),
    favicon: new Set<string>(),
    mobile: new Set<string>(),
    style: {},
  },
  dirty: false,
};

export const themeDesignerStore = createSimpleStore<ThemeDesignerStore>(defaultStoreValue);
