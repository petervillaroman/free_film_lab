/**
 * Negative to positive conversion implementation
 */
import { rgbToHsl, hslToRgb } from './colorUtils';
import { adjustChannelCurve, applySCurve, applyNoiseReduction } from './adjustments';
import type { NegativeConversionOptions } from './types';

/**
 * Convert a negative film image to a positive image with fine-tuning adjustments
 * Based on Alex Burke's manual inversion technique:
 * https://www.alexburkephoto.com/blog/2019/10/16/manual-inversion-of-color-negative-film
 * 
 * @param imageData The source image data (from canvas)
 * @param options Negative conversion options for fine-tuning
 * @returns Processed image data
 */
export const convertNegativeToPositive = (
  imageData: ImageData, 
  options: NegativeConversionOptions = {}
): ImageData => {
  const { 
    useBorderSampling = false, 
    baseSubtractionOpacity = 0.8,
    channelAdjustments = { r: 1.0, g: 0.8, b: 0.7 },
    contrastBoost = 1.1,
    cyanAdjustment = { hue: 10, saturation: 0.8, lightness: 0.1 }
  } = options;
  
  const { width, height } = imageData;
  
  // Create a single canvas for all operations to minimize data transfers
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { 
    willReadFrequently: true,
    alpha: false // Disable alpha for better performance
  });
  
  if (!ctx) {
    return imageData; // Return original if we can't get context
  }
  
  // Draw the original image to our working canvas
  ctx.putImageData(imageData, 0, 0);
  
  // Find the film base color (typically orange-brown)
  let filmBaseColor = { r: 220, g: 150, b: 130 }; // Default
  
  // Use manual film base color if provided
  if (options.filmBaseColor) {
    filmBaseColor = options.filmBaseColor;
    console.log('Using manual film base color:', filmBaseColor);
  }
  // Otherwise sample the border if requested
  else if (useBorderSampling) {
    // Sample the film border by checking pixels around the edges
    const sampleSize = 50; // Number of pixels to sample
    let totalR = 0, totalG = 0, totalB = 0;
    let sampleCount = 0;
    
    // Sample from all four edges
    const edges = [
      { x: (x: number) => x, y: () => 0 },                // Top edge
      { x: (x: number) => x, y: () => height - 1 },       // Bottom edge
      { x: () => 0, y: (y: number) => y },                // Left edge
      { x: () => width - 1, y: (y: number) => y }         // Right edge
    ];
    
    for (const edge of edges) {
      for (let i = 0; i < (edge.x === edge.y ? height : width) && sampleCount < sampleSize; i += 10) {
        const x = edge.x(i);
        const y = edge.y(i);
        const pixelData = ctx.getImageData(x, y, 1, 1).data;
        
        totalR += pixelData[0];
        totalG += pixelData[1];
        totalB += pixelData[2];
        sampleCount++;
      }
    }
    
    if (sampleCount > 0) {
      filmBaseColor = {
        r: Math.round(totalR / sampleCount),
        g: Math.round(totalG / sampleCount),
        b: Math.round(totalB / sampleCount)
      };
      console.log('Auto-sampled film base color:', filmBaseColor);
    }
  }
  
  // Get the image data for processing all at once
  const data = ctx.getImageData(0, 0, width, height);
  const pixels = data.data;
  
  // Create a buffer for the final image to avoid modifying pixel values in-place
  const outputData = new Uint8ClampedArray(pixels.length);
  
  // Process all pixels at once
  for (let i = 0; i < pixels.length; i += 4) {
    // STEP 1: Invert RGB values
    let r = 255 - pixels[i];
    let g = 255 - pixels[i + 1];
    let b = 255 - pixels[i + 2];
    
    // STEP 2: Subtract film base (using the "subtract" blend mode)
    // This helps neutralize the orange mask
    const subtractAmount = (color: number, base: number) => {
      // Apply a smoother transition for film base subtraction
      const amount = (255 - base) * baseSubtractionOpacity;
      return Math.max(0, Math.min(255, color - amount));
    };
    
    r = subtractAmount(r, filmBaseColor.r);
    g = subtractAmount(g, filmBaseColor.g);
    b = subtractAmount(b, filmBaseColor.b);
    
    // STEP 3: Apply channel adjustments with smoothing
    if (channelAdjustments.r !== 1.0) {
      r = adjustChannelCurve(r, channelAdjustments.r);
    }
    
    if (channelAdjustments.g !== 1.0) {
      g = adjustChannelCurve(g, channelAdjustments.g);
    }
    
    if (channelAdjustments.b !== 1.0) {
      b = adjustChannelCurve(b, channelAdjustments.b);
    }
    
    // STEP 4: Apply contrast boost (S-curve) if needed
    if (contrastBoost !== 1.0) {
      r = applySCurve(r, contrastBoost);
      g = applySCurve(g, contrastBoost);
      b = applySCurve(b, contrastBoost);
    }
    
    // STEP 5: Cyan adjustment with more precise detection and smoother transitions
    if (g > r && b > r && Math.abs(g - b) < 50) {
      // Detect cyan-ish colors more accurately
      const isCyan = (g + b) / 2 > r * 1.3 && g > 100 && b > 100;
      
      if (isCyan) {
        // Convert to HSL for hue adjustments
        const { h, s, l } = rgbToHsl(r, g, b);
        
        // Only adjust cyan hues with a wider range and smooth transition
        if (h > 150 && h < 210) {
          // Calculate adjustment strength based on how "cyan" the color is
          const cyanStrength = Math.min(1, (Math.min(g, b) - r) / 100);
          
          // Apply adjustments proportional to how cyan the color is
          const newH = h + cyanAdjustment.hue * cyanStrength;
          const newS = s * (1 - (1 - cyanAdjustment.saturation) * cyanStrength);
          const newL = l + cyanAdjustment.lightness * cyanStrength;
          
          // Convert back to RGB
          const rgb = hslToRgb(newH, newS, newL);
          r = rgb.r;
          g = rgb.g;
          b = rgb.b;
        }
      }
    }
    
    // Store final values
    outputData[i] = r;
    outputData[i + 1] = g;
    outputData[i + 2] = b;
    outputData[i + 3] = pixels[i + 3]; // Copy alpha
  }
  
  // Apply a subtle noise reduction and anti-aliasing
  if (width > 200 && height > 200) { // Only for images of reasonable size
    applyNoiseReduction(outputData, width, height, 0.5);
  }
  
  // Return the final processed image
  return new ImageData(outputData, width, height);
}; 