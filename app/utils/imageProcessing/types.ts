/**
 * Interface for negative conversion options
 */
export interface NegativeConversionOptions {
  // Film base color (orange mask)
  filmBaseColor?: {
    r: number;
    g: number;
    b: number;
  };
  // Opacity for film base subtraction (0-1)
  baseSubtractionOpacity?: number;
  // Channel adjustments based on Alex Burke's method
  channelAdjustments?: {
    r: number;  // Red adjustment (0-2)
    g: number;  // Green adjustment (0-2)
    b: number;  // Blue adjustment (0-2)
  };
  // Whether to use border sampling for negative conversion
  useBorderSampling?: boolean;
  // Contrast boost (S-curve strength)
  contrastBoost?: number;
  // Cyan/blue shift adjustment
  cyanAdjustment?: {
    hue: number;      // Shift hue (-180 to 180)
    saturation: number; // Saturation (0-2)
    lightness: number;  // Lightness (-1 to 1)
  }
}

// List of available processing types
export const processingTypes = [
  { value: "none", label: "No Processing" },
  { value: "negative-conversion", label: "Negative to Positive Conversion" },
]; 