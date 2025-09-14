import { meetsContrastGuidelines } from "polished";
import cloneDeep from "lodash.clonedeep";

import { isSolidColor, Option, tryCatch } from "@pega/cosmos-react-core";
import type { DefaultSettableTheme } from "@pega/cosmos-react-core";

import {
  ThemeMapping,
  basicThemeMapping,
  AccessibilityDependency,
  borderRadiusOptions,
  spacingOptions,
  fontOptions,
  layoutOptions,
  fontSizeOptions,
  tabLayoutOptions,
  fvlLayoutOptions,
} from "./constants";
import type {
  ThemeItem,
  BasicThemeItem,
  AccessibilityCheckPair,
  SizeMap,
  FontValue,
  BorderRadiusOptionKey,
  SpacingOptionKey,
  FontOptionKey,
  LayoutOptionKey,
  SelectInputOptionKey,
  FontSizeOptionsKey,
  TabLayoutOptionKey,
  FvlLayoutOptionKey,
} from "./constants";
import type { ThemeDesignerStore } from "./ThemeDesigner.types";

const borderRadius = "border-radius";
const { fontFamily } = ThemeMapping;

export const objectAssign = (target: any, source: any) => {
  Object.keys(source).forEach((key) => {
    const sVal = source[key];
    const tVal = target[key];
    target[key] =
      tVal && sVal && typeof tVal === "object" && typeof sVal === "object"
        ? objectAssign(tVal, sVal)
        : sVal;
  });
  return target;
};

const getFontFamilyValue = (val: string) => {
  const filteredOptions = (fontFamily.options as FontValue[]).filter(
    (obj: FontValue) => {
      return obj.value === val;
    },
  );
  if (filteredOptions.length === 0) {
    return "other";
  }
  return val;
};

export const getValueForThemeItem = (item: ThemeItem, theme: any) => {
  let val;
  if (item.path === "font-family") {
    val = getFontFamilyValue(theme.base[item.path]);
  } else if (item.attribute && theme[item.parentComponent][item.path]) {
    if (item.subPaths) {
      val = item.subPaths.reduce(
        (acc, key) => acc && acc[key],
        theme[item.parentComponent][item.path],
      )[item.attribute];
    } else {
      val = theme[item.parentComponent][item.path][item.attribute];
    }
  }

  return val ?? ThemeMapping.sizeMapWithBaseVal[item.defaultValue as SizeMap];
};

export const updateTheme = (
  selectedVal: any,
  item: ThemeItem,
  theme: any,
): Partial<DefaultSettableTheme> => {
  const updatedTheme = cloneDeep(theme);

  if (item.returnType === "number") {
    selectedVal = Number(selectedVal);
  }

  if (!updatedTheme[item.parentComponent]) {
    updatedTheme[item.parentComponent] = {};
  }

  if (!updatedTheme[item.parentComponent][item.path]) {
    updatedTheme[item.parentComponent][item.path] = {};
  }

  if (item.parentComponent === "components" && item.attribute) {
    if (item.subPaths) {
      const current = item.subPaths.reduce((acc, key) => {
        acc[key] = acc[key] || {};
        return acc[key];
      }, updatedTheme.components[item.path]);
      current[item.attribute] = selectedVal;
    } else {
      updatedTheme.components[item.path][item.attribute] = selectedVal;
    }
  }

  if (item.parentComponent === "base" && item.path) {
    if (item.attribute) {
      updatedTheme.base[item.path][item.attribute] = selectedVal;
    } else {
      updatedTheme.base[item.path] = selectedVal;
    }
  }

  return updatedTheme as Partial<DefaultSettableTheme>;
};

export const getSelectOptionsForItem = (
  item: ThemeItem,
  theme: DefaultSettableTheme,
  testId?: string,
) => {
  const options: any[] = [];
  if (item.attribute === borderRadius) {
    const baseRadiusWithoutRem = parseFloat(
      (theme.base![borderRadius]! as string).replace("rem", ""),
    );
    item.options?.forEach((label) => {
      if (typeof label === "string") {
        const relativeToBase =
          ThemeMapping.sizeMapWithBaseVal[label as SizeMap];
        const val =
          item.path === "card"
            ? `${baseRadiusWithoutRem * relativeToBase}rem`
            : `${relativeToBase}`;
        options.push(
          <Option value={val} key={val} data-testid={testId}>
            {label}
          </Option>,
        );
      }
    });
  } else if (item.path === "font-family") {
    item.options?.forEach((obj) => {
      if (typeof obj !== "string") {
        options.push(
          <Option value={obj.value} key={obj.value} data-testid={testId}>
            {obj.label}
          </Option>,
        );
      }
    });
  }
  return options;
};

export const calculateRatio = (
  accessibilityPair: AccessibilityCheckPair,
  theme: any,
) => {
  const [color1, color2] = accessibilityPair.map((accItem) =>
    typeof accItem !== "string"
      ? theme[accItem.parentComponent][accItem.path][
          accItem.attribute as string
        ]
      : accItem,
  );
  const colorItem1 = accessibilityPair[0];
  const colorItem2 = accessibilityPair[1];

  if (!isSolidColor(color1) || !isSolidColor(color2)) {
    return {
      [colorItem1.name]: colorItem2.label,
      [colorItem2.name]: colorItem1.label,
    };
  }

  const ratio = tryCatch(() => meetsContrastGuidelines(color1, color2));

  if (!ratio?.[accessibilityPair[2]]) {
    return {
      [colorItem1.name]: colorItem2.label,
      [colorItem2.name]: colorItem1.label,
    };
  }
  return {};
};

export const checkColorContrast = (theme: DefaultSettableTheme) => {
  const errors: ThemeDesignerStore["errors"]["style"] = {};
  AccessibilityDependency.forEach((accessibilityPair) => {
    const error = calculateRatio(accessibilityPair, theme);
    if (Object.keys(error).length > 0) {
      accessibilityPair.forEach((item) => {
        if (
          typeof item === "object" &&
          Object.keys(errors).includes(item.name)
        ) {
          errors[item.name] = [...errors[item.name], error[item.name]];
        } else if (typeof item === "object") {
          errors[item.name] = [error[item.name]];
        }
      });
    }
  });
  return errors;
};

/* Basic tab utils */

const getBasicFontFamilyValue = (val: string, key: string) => {
  const itemFontOptions = basicThemeMapping.fontGroup.items[key].inputControl
    .config.options as FontOptionKey[];
  const filteredOptions = itemFontOptions.filter((obj) => {
    return fontOptions[obj].value === val;
  });

  // invalid value, return 'other'
  if (filteredOptions.length === 0) {
    return "other";
  }
  return val;
};

const getFontSizeValue = (val: string) => {
  const itemFontOptions = basicThemeMapping.fontGroup.items.fontSize
    .inputControl.config.options as FontSizeOptionsKey[];
  const filteredOptions = itemFontOptions.filter((obj) => {
    return fontSizeOptions[obj].literalValue === val;
  });

  // invalid value, return 'other'
  if (filteredOptions.length === 0) {
    return "m";
  }
  return fontSizeOptions[filteredOptions[0]].value;
};

export const getNestedValue = (obj: any, path: string) => {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
};

const setNestedValue = (obj: any, path: string, value: any) => {
  const parts = path.split(".");
  const last = parts.pop();
  const target = parts.reduce((acc, part) => {
    if (!acc[part]) {
      acc[part] = {};
    }
    return acc[part];
  }, obj);
  if (target && last) {
    target[last] = value;
  }
};

const formatTokenValue = (
  item: BasicThemeItem,
  tokenValue: any,
  key?: string,
) => {
  if (item.token === "font-family") {
    return getBasicFontFamilyValue(tokenValue[item.token], key ?? "fontFamily");
  }
  if (item.token === "detached") {
    return String(tokenValue[item.token]);
  }
  if (item.token === "spacing") {
    return tokenValue[item.token];
  }
  const tokenPathFull = `${item.tokenPath}.${item.token}`;
  if (
    tokenPathFull === "components.button.border-radius" ||
    tokenPathFull === "components.form-control.border-radius"
  ) {
    return `${tokenValue[item.token]}rem`;
  }

  if (tokenPathFull === "base.font-size") {
    return getFontSizeValue(tokenValue[item.token]);
  }

  return tokenValue[item.token];
};

export const getFormattedThemeItemValue = (
  item: BasicThemeItem,
  theme: any,
  key?: string,
) => {
  const tokenValue = getNestedValue(theme, item.tokenPath);

  // convert token value to the correct format accepted by the input control
  return formatTokenValue(item, tokenValue, key) ?? item.defaultValue;
};

/**
 * Applies a token value to the updated theme object.
 * @param tokenPathFull - The full path of the token in the theme.
 * @param selectedValConverted - The converted value of the selected option.
 * @param updatedTheme - The updated theme object to apply the token value.
 */
function applyTokenValue(
  tokenPathFull: string,
  selectedValConverted: any,
  updatedTheme: any,
) {
  if (
    tokenPathFull === "components.button.border-radius" ||
    tokenPathFull === "components.form-control.border-radius"
  ) {
    const baseRadiusWithoutRem = parseFloat(
      (selectedValConverted as string).replace("rem", ""),
    );
    setNestedValue(updatedTheme, tokenPathFull, baseRadiusWithoutRem);
  } else if (tokenPathFull === "base.font-size") {
    const baseSize = Object.values(fontSizeOptions).find(
      (x) => x.value === selectedValConverted,
    )?.literalValue;
    setNestedValue(updatedTheme, tokenPathFull, baseSize);
  } else {
    setNestedValue(updatedTheme, tokenPathFull, selectedValConverted);
  }
}

export const updateBasicTheme = (
  selectedVal: any,
  item: BasicThemeItem,
  theme: any,
): Partial<DefaultSettableTheme> => {
  const updatedTheme = cloneDeep(theme);

  const selectedValConverted =
    item.token === "detached" ? selectedVal === "true" : selectedVal;
  const tokenPathFull = `${item.tokenPath}.${item.token}`;

  applyTokenValue(tokenPathFull, selectedValConverted, updatedTheme);

  if (item.otherTokensToUpdate) {
    item.otherTokensToUpdate.forEach((tokenPath) => {
      applyTokenValue(tokenPath, selectedValConverted, updatedTheme);
    });
  }

  return updatedTheme as Partial<DefaultSettableTheme>;
};

// This function is used to get the value of an option for Select input control
const getFormattedOptionValue = (
  optionKey: SelectInputOptionKey,
  item: BasicThemeItem,
) => {
  if (item.token === borderRadius) {
    // todo: replace item.defaultValue with theme token actual value
    const baseRadiusWithoutRem = parseFloat(
      (item.defaultValue as string).replace("rem", ""),
    );
    const relativeToBase =
      borderRadiusOptions[optionKey as BorderRadiusOptionKey].value;
    return {
      ...borderRadiusOptions[optionKey as BorderRadiusOptionKey],
      value:
        relativeToBase !== "default"
          ? `${baseRadiusWithoutRem * relativeToBase}rem`
          : relativeToBase,
    };
  }

  if (item.token === "detached") {
    if (item.name === "tabsLayoutStyle") {
      return tabLayoutOptions[optionKey as TabLayoutOptionKey];
    }
    if (item.name === "fvlLayoutStyle") {
      return fvlLayoutOptions[optionKey as FvlLayoutOptionKey];
    }
    return layoutOptions[optionKey as LayoutOptionKey];
  }

  if (item.token === "font-family") {
    return fontOptions[optionKey as FontOptionKey];
  }

  if (item.token === "font-size") {
    return fontSizeOptions[optionKey as FontSizeOptionsKey];
  }

  if (item.token === "spacing") {
    return spacingOptions[optionKey as SpacingOptionKey];
  }

  return {};
};

export const createThemeItemOptions = (item: BasicThemeItem): any[] => {
  const itemInputOptions = item.inputControl.config
    .options as SelectInputOptionKey[];
  return itemInputOptions.map((optionKey) => {
    return { label: optionKey, ...getFormattedOptionValue(optionKey, item) };
  });
};
