/**
 * Image processing module exports
 */

// Re-export types
export type { NegativeConversionOptions } from './types';
export { processingTypes } from './types';

// Re-export main processing functions
export { processImage } from './processor';
export { convertNegativeToPositive } from './negativeConverter';

// Export utility functions that might be useful elsewhere
export { rgbToHsl, hslToRgb } from './colorUtils';
export { adjustChannelCurve, applySCurve } from './adjustments'; 