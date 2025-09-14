"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FC } from "react";

import {
  BaseThemeMachine,
  Flex,
  Select,
  ThemeMachine,
  debounce,
  useSimpleStore,
  Text,
  Option,
  ComboBox,
  ThemeOverride,
  Icon,
  registerIcon,
  useI18n,
  Input,
} from "@pega/cosmos-react-core";
import type {
  DefaultSettableTheme,
  MenuItemProps,
  TestIdProp,
} from "@pega/cosmos-react-core";
import * as layoutConnected from "@pega/cosmos-react-core/lib/components/Icon/streamline-icons/layout-connected.icon";
import * as layoutDetached from "@pega/cosmos-react-core/lib/components/Icon/streamline-icons/layout-detached.icon";
import * as roundedExtraLarge from "@pega/cosmos-react-core/lib/components/Icon/streamline-icons/rounded-extra-large.icon";
import * as roundedLarge from "@pega/cosmos-react-core/lib/components/Icon/streamline-icons/rounded-large.icon";
import * as roundedMedium from "@pega/cosmos-react-core/lib/components/Icon/streamline-icons/rounded-medium.icon";
import * as roundedSmall from "@pega/cosmos-react-core/lib/components/Icon/streamline-icons/rounded-small.icon";
import * as roundedNone from "@pega/cosmos-react-core/lib/components/Icon/streamline-icons/rounded-none.icon";
import * as roundedPill from "@pega/cosmos-react-core/lib/components/Icon/streamline-icons/rounded-pill.icon";
import * as spacingCondensed from "@pega/cosmos-react-core/lib/components/Icon/streamline-icons/spacing-condensed.icon";
import * as spacingExpanded from "@pega/cosmos-react-core/lib/components/Icon/streamline-icons/spacing-expanded.icon";
import * as spacingStandard from "@pega/cosmos-react-core/lib/components/Icon/streamline-icons/spacing-standard.icon";
import * as knobs from "@pega/cosmos-react-core/lib/components/Icon/icons/knobs.icon";
import * as knobsSolid from "@pega/cosmos-react-core/lib/components/Icon/icons/knobs-solid.icon";

import {
  getFormattedThemeItemValue,
  createThemeItemOptions,
  updateBasicTheme,
} from "../../utils";
import {
  controlTypes,
  basicThemeMapping,
  fallBackFonts,
} from "../../constants";
import type { BasicThemeItem } from "../../constants";
import ColorPickerWrapper from "../ColorPickerWrapper";
import { themeDesignerStore } from "../../store";

import type {
  CustomFontVariables,
  ThemePaletteProps,
} from "../../ThemeDesigner.types";
import { StyledDivider, StyledToggleButton } from "../../styles";

registerIcon(
  layoutConnected,
  layoutDetached,
  roundedExtraLarge,
  roundedLarge,
  roundedMedium,
  roundedSmall,
  roundedNone,
  roundedPill,
  spacingCondensed,
  spacingExpanded,
  spacingStandard,
  knobs,
  knobsSolid,
);

const Basic: FC<
  TestIdProp &
    Required<Pick<ThemePaletteProps, "hiddenItems" | "hiddenGroups">> &
    Pick<ThemePaletteProps, "renderers">
> = ({ hiddenItems, renderers }) => {
  const t = useI18n();

  const [expandedGroups, setExpandedGroups] = useState(() =>
    Object.fromEntries(
      Object.entries(basicThemeMapping).map(([key, value]) => [
        key,
        value.expanded ?? false,
      ]),
    ),
  );

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }, []);

  const [
    [theme, font, headingFont, brandingFont, errors, readOnly, onUpdate],
    setStore,
  ] = useSimpleStore(themeDesignerStore, (store) => [
    store.theme,
    store.font,
    store.headingFont,
    store.brandingFont,
    store.errors,
    store.readOnly,
    store.onUpdate,
  ]);

  const customFontVariables: CustomFontVariables[] = [
    "fontFamily",
    "headingFont",
    "brandingFont",
  ];

  const themeDefinition: DefaultSettableTheme = useMemo(() => {
    return new ThemeMachine({
      theme,
      parent: BaseThemeMachine,
    }).theme;
  }, [theme]);

  useEffect(() => {
    setStore((store) => ({
      ...store,
      errors: { ...store.errors },
    }));
  }, [setStore, themeDefinition]);

  const updateThemeOverrides = useCallback(
    (selectedVal: string | number, item: BasicThemeItem) => {
      let updatedTheme: Partial<DefaultSettableTheme> = theme;
      if (selectedVal === "other") {
        selectedVal = "";
      }
      if (
        selectedVal === "default" &&
        (item.name === "buttonRoundCorners" ||
          item.name === "inputsRoundCorners")
      ) {
        selectedVal = theme.components?.card?.["border-radius"] as string;
      }
      updatedTheme = updateBasicTheme(selectedVal, item, updatedTheme);

      setStore((store) => ({ ...store, theme: updatedTheme, dirty: true }));
      onUpdate?.("theme", updatedTheme);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  );

  const debouncedUpdateTheme = debounce(updateThemeOverrides, 200);

  const validateFontFamily = useCallback(
    (key: string) => {
      if (key === "headingFont") {
        setStore((store) => ({
          ...store,
          errors: {
            ...store.errors,
            headingFont: headingFont.name
              ? new Set()
              : new Set(["Font family name"]),
          },
        }));
        return !!headingFont.name;
      }
      if (key === "brandingFont") {
        setStore((store) => ({
          ...store,
          errors: {
            ...store.errors,
            brandingFont: brandingFont.name
              ? new Set()
              : new Set(["Font family name"]),
          },
        }));
        return !!brandingFont.name;
      }
      setStore((store) => ({
        ...store,
        errors: {
          ...store.errors,
          font: font.name ? new Set() : new Set(["Font family name"]),
          headingFont: headingFont.name
            ? new Set()
            : new Set(["Font family name"]),
          brandingFont: brandingFont.name
            ? new Set()
            : new Set(["Font family name"]),
        },
      }));
      return !!font.name;
    },
    [font, headingFont, brandingFont, setStore],
  );

  const setCustomFontFamilyName = (key: string, value: string) => {
    if (key === "headingFont") {
      setStore((store) => ({
        ...store,
        headingFont: { ...store.headingFont, name: value },
      }));
    } else if (key === "brandingFont") {
      setStore((store) => ({
        ...store,
        brandingFont: { ...store.brandingFont, name: value },
      }));
    } else {
      setStore((store) => ({
        ...store,
        font: { ...store.font, name: value },
        headingFont: { ...store.headingFont, name: value },
        brandingFont: { ...store.brandingFont, name: value },
      }));
    }
  };

  const customFontKeys = useMemo(() => {
    return customFontVariables
      .map((x) =>
        getFormattedThemeItemValue(
          basicThemeMapping.fontGroup.items[x],
          themeDefinition,
          x,
        ) === "other"
          ? x
          : null,
      )
      .filter((x) => x !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeDefinition]);

  useEffect(() => {
    if (customFontKeys.length === 0) {
      return;
    }

    customFontKeys.forEach((key) => {
      let fontToken = themeDefinition?.base?.["font-family"] as string;
      if (key === "headingFont") {
        fontToken = themeDefinition?.components?.text?.h1?.[
          "font-family"
        ] as string;
      } else if (key === "brandingFont") {
        fontToken = themeDefinition?.components?.text?.["brand-primary"]?.[
          "font-family"
        ] as string;
      }

      const customFontFamilyName = fontToken?.includes(fallBackFonts)
        ? fontToken.replace(`,${fallBackFonts}`, "")
        : "";

      setCustomFontFamilyName(key, customFontFamilyName);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    customFontKeys,
    setStore,
    themeDefinition?.base,
    themeDefinition?.components,
  ]);

  const defaultFontValue = themeDefinition?.base?.["font-family"] as string;
  const headingFontValue = themeDefinition?.components?.text?.h1?.[
    "font-family"
  ] as string;
  const brandingFontValue = themeDefinition?.components?.text?.[
    "brand-primary"
  ]?.["font-family"] as string;

  const cardBorderRadiusSelectedValue = getFormattedThemeItemValue(
    basicThemeMapping.roundCornersGroup.items.roundCorners,
    themeDefinition,
    "roundCorners",
  );

  return (
    <Flex
      container={{
        direction: "column",
        gap: 1,
      }}
    >
      {Object.keys(basicThemeMapping).map((themeMappingKey) => {
        return (
          <Flex
            key={themeMappingKey}
            container={{
              direction: "column",
              gap: 1,
            }}
          >
            {basicThemeMapping[themeMappingKey]?.label && (
              <Flex
                container={{ justify: "between", alignItems: "center" }}
                item={{ grow: 1 }}
              >
                <Text variant="h3">
                  {basicThemeMapping[themeMappingKey].label}
                </Text>
                {Object.keys(basicThemeMapping[themeMappingKey].items).length >
                  1 && (
                  <StyledToggleButton
                    onClick={() => toggleGroup(themeMappingKey)}
                    icon
                    compact
                    variant="simple"
                    aria-pressed={expandedGroups[themeMappingKey]}
                    label={t("advanced_settings_toggle_btn", [
                      expandedGroups[themeMappingKey] ? "Hide" : "Show",
                    ])}
                  >
                    <Icon
                      name={
                        expandedGroups[themeMappingKey]
                          ? "knobs-solid"
                          : "knobs"
                      }
                    />
                  </StyledToggleButton>
                )}
              </Flex>
            )}

            {Object.keys(basicThemeMapping[themeMappingKey].items).map(
              (key) => {
                const item = basicThemeMapping[themeMappingKey].items[key];
                if (item.hidden) {
                  return <div key={key} style={{ display: "none" }} />;
                }

                // Skip hidden items when group is not expanded
                if (!expandedGroups[themeMappingKey] && !item.defaultExpanded)
                  return <div key={key} style={{ display: "none" }} />;

                let themeItemValue = getFormattedThemeItemValue(
                  item,
                  themeDefinition,
                  key,
                );

                if (basicThemeMapping[themeMappingKey].label === "Font") {
                  if (
                    key === "headingFont" &&
                    headingFontValue === defaultFontValue
                  ) {
                    themeItemValue = "default";
                  }

                  if (
                    key === "brandingFont" &&
                    brandingFontValue === defaultFontValue
                  ) {
                    themeItemValue = "default";
                  }
                }

                if (
                  basicThemeMapping[themeMappingKey].label === "Corners" &&
                  (key === "buttonRoundCorners" ||
                    key === "inputRoundCorners") &&
                  themeItemValue === cardBorderRadiusSelectedValue
                ) {
                  themeItemValue = "default";
                }

                let options = createThemeItemOptions(item);
                if (!["Default", "Whitespace"].includes(item.label)) {
                  options = options.map(({ icon: _icon, ...rest }) => rest);
                }
                if (
                  (customFontVariables.includes(key as CustomFontVariables) &&
                    hiddenItems.includes("fontFamily")) ||
                  (renderers?.font &&
                    ["headingFont", "brandingFont"].includes(key))
                ) {
                  options = options.filter((x) => x.category !== "Custom");
                }

                const selectedOption = options.find(
                  (option) => option.value === themeItemValue,
                );

                let fontValue: string | undefined = font.name;
                let fontLabel = "Default";
                let fontErrors: Set<string> | undefined = errors.font;
                if (key === "headingFont") {
                  fontValue = headingFont?.name;
                  fontLabel = "Headings";
                  fontErrors = errors.headingFont;
                } else if (key === "brandingFont") {
                  fontValue = brandingFont?.name;
                  fontLabel = "App header";
                  fontErrors = errors.brandingFont;
                }

                switch (item.inputControl.controlType) {
                  case controlTypes.select:
                    return (
                      <Select
                        key={key}
                        readOnly={readOnly}
                        value={themeItemValue}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                          updateThemeOverrides(e.target.value, item)
                        }
                        label={item.label}
                      >
                        {options.map(({ label, value }) => (
                          <Option value={value} key={`${key}.${label}`}>
                            {label}
                          </Option>
                        ))}
                      </Select>
                    );
                  case controlTypes.combobox:
                    return (
                      <React.Fragment key={`${key}-combobox`}>
                        <ComboBox
                          label={item.label}
                          readOnly={readOnly}
                          info={
                            key === "fontFamily" ? t("default_font_info") : ""
                          }
                          mode="single-select"
                          visual={
                            selectedOption?.icon ? (
                              <Icon
                                set="streamline"
                                name={selectedOption.icon}
                              />
                            ) : undefined
                          }
                          selected={{
                            items: {
                              id: selectedOption?.value,
                              text: selectedOption?.label,
                            },
                          }}
                          menu={{
                            items: options.map(
                              ({ label, value, icon, category }) => ({
                                id: value,
                                visual: icon ? (
                                  <Icon set="streamline" name={icon} />
                                ) : undefined,
                                primary:
                                  item.token === "font-family" ? (
                                    <ThemeOverride
                                      theme={{
                                        base: {
                                          "font-family":
                                            value === "other"
                                              ? fallBackFonts
                                              : value,
                                        },
                                        components: {
                                          text: {
                                            primary: {
                                              "font-family":
                                                value === "other"
                                                  ? fallBackFonts
                                                  : value,
                                            },
                                          },
                                        },
                                      }}
                                    >
                                      <Text>{label}</Text>
                                    </ThemeOverride>
                                  ) : (
                                    label
                                  ),
                                secondary: category
                                  ? [
                                      <Text key={value} variant="secondary">
                                        {category}
                                      </Text>,
                                    ]
                                  : undefined,
                                selected: themeItemValue === value,
                              }),
                            ),
                            onItemClick: (id: MenuItemProps["id"]) => {
                              updateThemeOverrides(id, item);
                            },
                          }}
                        />
                        {!hiddenItems.includes("fontFamily") &&
                          selectedOption?.value === "other" &&
                          (renderers?.font ? (
                            renderers?.font
                          ) : (
                            <Input
                              type="text"
                              status={
                                fontErrors && fontErrors.has("Font family name")
                                  ? "error"
                                  : undefined
                              }
                              label={t("custom_font_family", [fontLabel])}
                              readOnly={readOnly}
                              value={fontValue}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                setCustomFontFamilyName(key, e.target.value);
                              }}
                              onBlur={() => {
                                if (validateFontFamily(key) && fontValue) {
                                  const customFont = fontValue
                                    ? `${fontValue},${fallBackFonts}`
                                    : fontValue;
                                  updateThemeOverrides(
                                    customFont,
                                    basicThemeMapping.fontGroup.items[key],
                                  );
                                }
                              }}
                            />
                          ))}
                      </React.Fragment>
                    );

                  case controlTypes.backgroundPicker:
                    return (
                      <ColorPickerWrapper
                        label={item.label}
                        name={item.name}
                        key={key}
                        readOnly={readOnly}
                        errors={[]}
                        value={themeItemValue}
                        backgroundOptions={item.inputControl.config.options}
                        showColorSwatches={
                          item.inputControl.config.showColorSwatches
                        }
                        onSwatchClick={(color: any) => {
                          debouncedUpdateTheme(color, item);
                        }}
                        onChange={(e) => debouncedUpdateTheme(e.hex, item)}
                        onSubmit={(bg) => debouncedUpdateTheme(bg, item)}
                      />
                    );
                  default:
                    return null;
                }
              },
            )}
            {basicThemeMapping[themeMappingKey] && (
              <StyledDivider key={`${themeMappingKey}-divider`} />
            )}
          </Flex>
        );
      })}
    </Flex>
  );
};

export default Basic;
