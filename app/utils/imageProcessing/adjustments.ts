/**
 * Image adjustment utilities for processing film negatives
 */

/**
 * Apply a simple noise reduction to the image data
 * @param data The image data to process
 * @param width Image width
 * @param height Image height
 * @param strength Strength of the effect (0-1)
 */
export const applyNoiseReduction = (data: Uint8ClampedArray, width: number, height: number, strength: number = 0.5) => {
  // Create a copy of the data to use as reference
  const original = new Uint8ClampedArray(data);
  
  // Skip edge pixels to simplify
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // For each RGB channel
      for (let c = 0; c < 3; c++) {
        // Get neighboring pixels
        const neighbors = [
          original[idx - width * 4 + c],  // top
          original[idx + width * 4 + c],  // bottom
          original[idx - 4 + c],          // left
          original[idx + 4 + c]           // right
        ];
        
        // Calculate average of neighbors
        const avg = neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
        
        // Blend current pixel with average based on strength
        data[idx + c] = Math.round((1 - strength) * data[idx + c] + strength * avg);
      }
    }
  }
};

/**
 * Apply a channel curve adjustment with smoother transitions
 * @param value Channel value (0-255)
 * @param strength Adjustment strength (0-2, 1 is neutral)
 */
export const adjustChannelCurve = (value: number, strength: number): number => {
  // Normalize to 0-1
  const normalized = value / 255;
  
  // Apply a smoother power curve
  let adjusted;
  
  if (strength === 1.0) {
    adjusted = normalized; // No change
  } else if (strength < 1.0) {
    // For reducing a channel, use a gentler curve
    adjusted = Math.pow(normalized, 1 / (0.9 * strength + 0.1));
  } else {
    // For boosting a channel, use a different curve to prevent oversaturation
    adjusted = Math.pow(normalized, 1 / strength);
  }
  
  // Convert back to 0-255 range with rounding
  return Math.max(0, Math.min(255, Math.round(adjusted * 255)));
};

/**
 * Apply an S-curve for contrast enhancement with smoother transitions
 * @param value Channel value (0-255)
 * @param strength Curve strength (0-2)
 */
export const applySCurve = (value: number, strength: number): number => {
  // Normalize to -1 to 1 range
  const normalized = (value / 127.5) - 1;
  
  // Apply S-curve using a sigmoid function with damping for extreme values
  const dampenedStrength = (strength - 1) * 3 + 1; // Reduce effect of extreme values
  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
  
  // Apply sigmoid with controlled strength factor
  const adjusted = sigmoid(normalized * dampenedStrength) * 2 - 1;
  
  // Convert back to 0-255 range with proper rounding
  return Math.max(0, Math.min(255, Math.round((adjusted + 1) * 127.5)));
}; 