"use client";

import { useCallback, useEffect, useMemo } from "react";
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
} from "@pega/cosmos-react-core";
import type { DefaultSettableTheme, TestIdProp } from "@pega/cosmos-react-core";

import {
  getValueForThemeItem,
  getSelectOptionsForItem,
  checkColorContrast,
  updateTheme,
} from "../../utils";
import { ThemeMapping, groups } from "../../constants";
import type { ThemeItem } from "../../constants";
import ColorPickerWrapper from "../ColorPickerWrapper";
import { themeDesignerStore } from "../../store";

import type {
  GroupKeys,
  ThemeItemKeys,
  ThemePaletteProps,
} from "../../ThemeDesigner.types";

const Style: FC<
  TestIdProp &
    Required<
      Pick<ThemePaletteProps, "hiddenItems" | "hiddenGroups" | "hiddenTabs">
    >
> = ({ hiddenItems, hiddenGroups, hiddenTabs }) => {
  const { paletteColors, borders, buttons } = ThemeMapping;

  const [[theme, errors, readOnly, onUpdate], setStore] = useSimpleStore(
    themeDesignerStore,
    (store) => [store.theme, store.errors, store.readOnly, store.onUpdate],
  );
  const themeDefinition: DefaultSettableTheme = useMemo(() => {
    return new ThemeMachine({
      theme,
      parent: BaseThemeMachine,
    }).theme;
  }, [theme]);

  const buttonThemeOptions = useMemo(() => {
    const valueSet = new Set();
    valueSet.add(themeDefinition.base?.palette?.["brand-primary"]);
    const options: Record<string, string> = {
      Branding: themeDefinition.base?.palette?.["brand-primary"] as string,
    };

    if (!valueSet.has(themeDefinition.base?.palette?.interactive)) {
      options.Interactive = themeDefinition.base?.palette
        ?.interactive as string;
      valueSet.add(themeDefinition.base?.palette?.interactive);
    }
    if (!valueSet.has(themeDefinition.base?.palette?.["border-line"])) {
      options.Borders = themeDefinition.base?.palette?.[
        "border-line"
      ] as string;
    }

    return options;
  }, [themeDefinition]);

  useEffect(() => {
    setStore((store) => ({
      ...store,
      errors: { ...store.errors, style: checkColorContrast(themeDefinition) },
    }));
  }, [setStore, themeDefinition]);

  const updateThemeOverrides = useCallback(
    (selectedVal: string | number, item: ThemeItem) => {
      let updatedTheme: Partial<DefaultSettableTheme> = theme;
      if (item.dependencies && !hiddenGroups.includes("buttons")) {
        const currentVal = getValueForThemeItem(item, themeDefinition);
        item.dependencies.forEach((dependency: ThemeItem) => {
          const dependencyVal = getValueForThemeItem(
            dependency,
            themeDefinition,
          );
          if (currentVal === dependencyVal) {
            updatedTheme = updateTheme(selectedVal, dependency, updatedTheme);
          }
        });
      }
      updatedTheme = updateTheme(selectedVal, item, updatedTheme);
      setStore((store) => ({ ...store, theme: updatedTheme, dirty: true }));
      onUpdate?.("theme", updatedTheme);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setStore, theme, onUpdate],
  );

  const debouncedUpdateTheme = debounce(updateThemeOverrides, 200);
  return (
    <Flex
      container={{
        direction: "column",
        gap: 2,
      }}
    >
      {(Object.keys(groups) as GroupKeys).map((themeMappingKey) => {
        if (hiddenGroups.includes(themeMappingKey)) return;
        return (
          <Flex
            key={themeMappingKey}
            container={{
              direction: "column",
              gap: 1,
            }}
          >
            {!hiddenTabs.includes("basic") &&
            themeMappingKey === "borders" ? null : (
              <Text variant="h3">{groups[themeMappingKey]}</Text>
            )}

            {hiddenTabs.includes("basic") && themeMappingKey === "borders" && (
              <>
                {(
                  Object.keys(ThemeMapping[themeMappingKey]) as ThemeItemKeys
                ).map((key) => {
                  if (hiddenItems.includes(key)) return;
                  const fontAndBorderItem = borders[key];
                  const val = getValueForThemeItem(
                    fontAndBorderItem,
                    themeDefinition,
                  );
                  const options = getSelectOptionsForItem(
                    fontAndBorderItem,
                    themeDefinition,
                  );
                  return (
                    <Select
                      key={key}
                      readOnly={readOnly}
                      value={val}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        updateThemeOverrides(e.target.value, fontAndBorderItem)
                      }
                      id={fontAndBorderItem.name}
                      label={fontAndBorderItem.label}
                    >
                      {options}
                    </Select>
                  );
                })}
              </>
            )}
            {themeMappingKey === "buttons" && (
              <>
                {(
                  Object.keys(ThemeMapping[themeMappingKey]) as ThemeItemKeys
                ).map((key) => {
                  if (hiddenItems.includes(key)) return;
                  const val = getValueForThemeItem(
                    buttons[key],
                    themeDefinition,
                  );
                  let label = buttons[key].label;
                  if (
                    key === "secondaryColor" &&
                    getValueForThemeItem(
                      buttons.secondaryFillStyle,
                      themeDefinition,
                    ) === "fill"
                  ) {
                    label = "Secondary button background";
                  }

                  const item = buttons[key];

                  return key === "buttonFg" ? (
                    <ColorPickerWrapper
                      label={label}
                      name={item.name}
                      key={key}
                      readOnly={readOnly}
                      value={val}
                      errors={errors.style?.[item.name] || []}
                      backgroundOptions={item.backgroundOptions}
                      onSubmit={(bg) => debouncedUpdateTheme(bg, item)}
                      onChange={(e) => debouncedUpdateTheme(e.hex, item)}
                    />
                  ) : (
                    <Select
                      label={label}
                      key={key}
                      readOnly={readOnly}
                      value={val}
                      id={buttons[key].name}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        updateThemeOverrides(e.target.value, buttons[key])
                      }
                    >
                      {(key === "secondaryFillStyle"
                        ? buttons[key].options!
                        : Object.keys(buttonThemeOptions)
                      ).map((opt) => (
                        <Option
                          key={opt as string}
                          name={opt}
                          value={
                            key === "secondaryFillStyle"
                              ? (opt as string).toLowerCase()
                              : buttonThemeOptions[
                                  opt as "Branding" | "Interactive" | "Borders"
                                ]
                          }
                        >
                          {opt as string}
                        </Option>
                      ))}
                    </Select>
                  );
                })}
              </>
            )}
            {themeMappingKey !== "borders" && themeMappingKey !== "buttons" && (
              <>
                {(Object.keys(paletteColors[themeMappingKey]) as ThemeItemKeys)
                  .slice()
                  .sort((x, y) =>
                    paletteColors[themeMappingKey][x].label.localeCompare(
                      paletteColors[themeMappingKey][y].label,
                    ),
                  )
                  .map((key) => {
                    if (
                      hiddenItems.includes(key) ||
                      (!hiddenTabs.includes("basic") && key === "brandingColor")
                    ) {
                      return;
                    }

                    if (
                      !hiddenGroups.includes("buttons") &&
                      key === "buttonFg"
                    ) {
                      return;
                    }

                    const item = paletteColors[themeMappingKey][key];
                    const val = getValueForThemeItem(item, themeDefinition);
                    return (
                      <ColorPickerWrapper
                        label={item.label}
                        name={item.name}
                        key={key}
                        readOnly={readOnly}
                        value={val}
                        errors={errors.style?.[item.name] || []}
                        backgroundOptions={item.backgroundOptions}
                        onSubmit={(bg: any) => debouncedUpdateTheme(bg, item)}
                        onChange={(e: any) => debouncedUpdateTheme(e.hex, item)}
                      />
                    );
                  })}
              </>
            )}
          </Flex>
        );
      })}
    </Flex>
  );
};

export default Style;
