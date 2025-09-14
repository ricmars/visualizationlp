"use client";

import { forwardRef, useState, useEffect, useCallback, useMemo } from "react";
import type { PropsWithoutRef } from "react";

import {
  Form,
  useConsolidatedRef,
  useSimpleStore,
} from "@pega/cosmos-react-core";
import { RootContainer } from "./styles";
import type { ThemeDesignerProps } from "./ThemeDesigner.types";

import { themeDesignerStore, defaultStoreValue } from "./store";

const ThemeDesigner = forwardRef<
  HTMLFormElement,
  PropsWithoutRef<ThemeDesignerProps>
>(({ name, theme, readOnly = false }, ref) => {
  const [, setStore] = useSimpleStore(themeDesignerStore, () => {});
  const [parentHeight, setParentHeight] = useState<number>(0);
  const formRef = useConsolidatedRef(ref);

  useEffect(() => {
    setStore(() => ({ ...defaultStoreValue, theme, readOnly, name }));
  }, [theme, setStore, readOnly, name]);

  const resizeObserver = useMemo(
    () =>
      new ResizeObserver((entries) => {
        if (
          Math.ceil(entries[0].contentRect.height) !== Math.ceil(parentHeight)
        ) {
          setParentHeight(entries[0].contentRect.height);
        }
      }),
    [parentHeight],
  );

  const wrapperRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        let currentNode: HTMLElement = node;

        while (currentNode.parentElement && currentNode.id !== "root") {
          currentNode = currentNode.parentElement;
        }
        resizeObserver.observe(currentNode);
        setParentHeight(currentNode.offsetHeight);
      } else {
        resizeObserver.disconnect();
      }
    },
    [resizeObserver],
  );

  const comp = (
    <RootContainer ref={wrapperRef} parentHeight={parentHeight}>
      <Form ref={formRef}>
        <div>Theme Designer - Basic Implementation</div>
      </Form>
    </RootContainer>
  );

  return comp;
});

export default ThemeDesigner;
