import { hideVisually, transparentize } from "polished";
import styled, { css } from "styled-components";

import {
  Button,
  Flex,
  StyledButton,
  StyledFormControl,
  StyledLabel,
  TabPanel,
} from "@pega/cosmos-react-core";
import { StyledFormField } from "@pega/cosmos-react-core/lib/components/FormField/FormField";

export const PaletteContainer = styled.div(({ theme }) => {
  return css`
    width: 100%;
    max-width: ${theme?.base?.["content-width"]?.sm || "600px"};
    padding: calc(1.25 * ${theme?.base?.spacing || "1rem"})
      calc(2.5 * ${theme?.base?.spacing || "1rem"});
    height: 100%;
    overflow: hidden;
    background-color: ${theme?.base?.palette?.["primary-background"] || "#fff"};
    border: none;
  `;
});

export const RootContainer = styled.div<{ parentHeight: number }>(
  ({ theme, parentHeight }) => {
    return css`
      overflow: hidden;
      background-color: ${theme?.base?.palette?.["app-background"] ||
      "#f5f5f5"};
      height: ${parentHeight ? `${parentHeight}px` : "auto"};
      min-width: 70%;

      &&& form {
        min-width: ${theme?.base?.["content-width"]?.sm || "600px"};
        max-width: ${theme?.base?.["content-width"]?.sm || "600px"};
      }

      form > div:first-child {
        height: 100%;
      }
    `;
  },
);

export const PreviewContainer = styled.div<{ previewURL?: string }>(
  ({ theme, previewURL }) => {
    return css`
      position: relative;
      margin: calc(3 * ${theme?.base?.spacing || "1rem"});
      overflow-y: auto;
      z-index: 1;
      & figure > div:first-child > ul {
        display: none;
      }
      width: ${previewURL ? "100%" : "auto"};
    `;
  },
);

export const StyledSaveContainer = styled.div(({ theme }) => {
  return css`
    padding-block: ${theme?.base?.spacing || "1rem"};
    h2 {
      max-width: ${theme?.base?.["content-width"]?.xs || "400px"};
      word-break: break-word;
    }
  `;
});

export const StyledPaletteRow = styled.div`
  position: relative;
  ${StyledFormField} {
    ${StyledFormControl} {
      width: 1.25rem;
      height: 1.25rem;
    }
    width: 100%;
  }

  & > div > div:last-child {
    ${hideVisually}
  }

  ${StyledLabel} {
    align-self: center;
  }
`;

export const StyledWarnIcon = styled(Button)(({ theme }) => {
  return css`
    position: absolute;
    inset-inline-end: calc(4 * ${theme?.base?.spacing || "1rem"});
    inset-block-end: calc(0.5 * ${theme?.base?.spacing || "1rem"});
    z-index: 1;

    svg {
      color: ${theme?.base?.palette?.warn || "#ff6b6b"};
    }
  `;
});

export const StyledErrorList = styled.ul(({ theme }) => {
  return css`
    margin-block-start: ${theme?.base?.spacing || "1rem"};
    padding-inline: calc(2 * ${theme?.base?.spacing || "1rem"});
    li {
      margin-block: calc(2 * ${theme?.base?.spacing || "1rem"});

      &:last-child {
        margin-block-end: 0;
      }
    }
  `;
});

export const StyledTabPanelContainer = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
`;

export const StyledTabPanel = styled(TabPanel)(({ theme }) => {
  return css`
    position: absolute;
    height: 100%;
    width: 100%;
    overflow-y: auto;
    padding: calc(0.5 * ${theme?.base?.spacing || "1rem"});
    padding-inline-end: calc(1.25 * ${theme?.base?.spacing || "1rem"});
  `;
});

export const StyledColorSwatches = styled(Flex)(({ theme }) => {
  return css`
    margin-block-end: ${theme?.base?.spacing || "1rem"};
    ${StyledButton} {
      margin: 0;
    }
  `;
});

export const StyledDivider = styled(Flex)(
  ({ theme }) => css`
    border-top: 0.0625rem dashed
      ${theme?.base?.palette?.["border-line"] || "#ccc"};
    margin-block: calc(0.5 * ${theme?.base?.spacing || "1rem"});
  `,
);

export const StyledToggleButton = styled(Button)(({ theme }) => {
  return css`
    background: inherit;

    &[aria-pressed="true"] {
      background: ${transparentize(
        0.85,
        theme?.base?.palette?.["foreground-color"] || "#000",
      )};
    }
  `;
});
