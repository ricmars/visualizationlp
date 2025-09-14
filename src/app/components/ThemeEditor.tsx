"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Flex,
  registerIcon,
  Tabs,
  useSimpleStore,
} from "@pega/cosmos-react-core";
import { TabbedPageTab } from "@pega/cosmos-react-core/lib/components/PageTemplates/PageTemplates";
import { ThemeDesignerStore } from "./ThemeDesigner/ThemeDesigner.types";
import { themeDesignerStore, defaultStoreValue } from "./ThemeDesigner/store";
import Style from "./ThemeDesigner/components/TabsContents/Style";
import Basic from "./ThemeDesigner/components/TabsContents/Basic";
import { StyledTabPanelContainer } from "./ThemeDesigner/styles";
import { StyledTabPanel } from "./ThemeDesigner/components/styles";
import { DefaultTheme } from "styled-components";

import * as layersSolidIcon from "@pega/cosmos-react-core/lib/components/Icon/icons/layers-solid.icon";

registerIcon(layersSolidIcon);

export type ThemeEditorProps = {
  theme: DefaultTheme;
  name: string;
  onUpdate: (theme: DefaultTheme) => void;
};

const ThemeEditor = (props: ThemeEditorProps) => {
  const { theme, name, onUpdate } = props;
  const [, setStore] = useSimpleStore(themeDesignerStore, () => {});
  const [panelShown, setPanelShown] = useState("basic");

  const handleUpdate: ThemeDesignerStore["onUpdate"] = useCallback(
    (key: string, payload: any) => {
      if (key === "theme") {
        // Update the theme using the payload
        onUpdate(payload as DefaultTheme);
      }
    },
    [onUpdate],
  );

  useEffect(() => {
    setStore(() => ({
      ...defaultStoreValue,
      theme,
      readOnly: false,
      name,
      onUpdate: handleUpdate,
    }));
  }, [theme, setStore, name, handleUpdate]);

  const paletteTabs: TabbedPageTab[] = [
    {
      id: "basic",
      name: "Quick settings",
      content: <Basic hiddenGroups={["background"]} hiddenItems={[]} />,
    },
    {
      id: "style",
      name: "Colors",
      content: (
        <Style
          hiddenItems={[]}
          hiddenGroups={["background"]}
          hiddenTabs={["fonts"]}
        />
      ),
    },
  ];

  return (
    <Flex container={{ direction: "column", rowGap: 1.5 }} item={{ grow: 1 }}>
      <Tabs
        tabs={paletteTabs}
        onTabClick={setPanelShown}
        currentTabId={panelShown}
      />
      <StyledTabPanelContainer>
        {paletteTabs.map((tab) => {
          return (
            <StyledTabPanel
              tabId={tab.id}
              currentTabId={panelShown}
              key={tab.id}
            >
              {tab.content}
            </StyledTabPanel>
          );
        })}
      </StyledTabPanelContainer>
    </Flex>
  );
};

export default ThemeEditor;
