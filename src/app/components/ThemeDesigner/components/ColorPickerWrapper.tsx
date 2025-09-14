"use client";

import {
  Icon,
  registerIcon,
  ColorPicker,
  Button,
} from "@pega/cosmos-react-core";
import type { ColorPickerProps, OmitStrict } from "@pega/cosmos-react-core";
import * as warnIcon from "@pega/cosmos-react-core/lib/components/Icon/icons/warn.icon";
import * as circleSolidIcon from "@pega/cosmos-react-core/lib/components/Icon/icons/circle-solid.icon";

import { StyledPaletteRow, StyledColorSwatches } from "../styles";

import { colorSwatchPalette } from "../constants";
import {
  BackgroundPicker,
  BackgroundPickerProps,
} from "@pega/cosmos-react-build";

// Registering icon to be available for static live reload
registerIcon(warnIcon, circleSolidIcon);

interface ColorPickerWrapperProps
  extends OmitStrict<ColorPickerProps, "value" | "onSubmit">,
    Pick<BackgroundPickerProps, "value" | "backgroundOptions"> {
  name: string;
  errors: string[];
  onSubmit?: BackgroundPickerProps["onSubmit"];
  onSwatchClick?: (color: string) => void;
  showColorSwatches?: boolean;
}

const ColorPickerWrapper = ({
  label,
  name,
  value,
  readOnly = false,
  onChange,
  onSubmit,
  onSwatchClick,
  onBeforeClose,
  showColorSwatches = false,
  backgroundOptions,
}: ColorPickerWrapperProps) => {
  return (
    <StyledPaletteRow key={name}>
      {showColorSwatches && onSwatchClick && (
        <StyledColorSwatches container={{ justify: "between" }}>
          {colorSwatchPalette.map(({ colorName, color }) => {
            return (
              <Button
                variant="simple"
                key={color}
                aria-label={colorName}
                disabled={readOnly}
                icon
                compact
                onClick={() => onSwatchClick(color)}
              >
                <Icon style={{ color }} name="circle-solid" />
              </Button>
            );
          })}
        </StyledColorSwatches>
      )}
      {backgroundOptions && backgroundOptions.length > 0 && onSubmit ? (
        <BackgroundPicker
          id={name}
          readOnly={readOnly}
          value={value}
          swatchOnly
          inline
          label={label}
          backgroundOptions={backgroundOptions}
          onSubmit={onSubmit}
          onBeforeClose={onBeforeClose}
        />
      ) : (
        <ColorPicker
          id={name}
          readOnly={readOnly}
          value={value}
          swatchOnly
          inline
          label={label}
          onChange={onChange}
          onBeforeClose={onBeforeClose}
        />
      )}
    </StyledPaletteRow>
  );
};

export default ColorPickerWrapper;
