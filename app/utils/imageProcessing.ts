/**
 * Utility functions for image processing
 */

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

/**
 * Apply a simple noise reduction to the image data
 * @param data The image data to process
 * @param width Image width
 * @param height Image height
 * @param strength Strength of the effect (0-1)
 */
const applyNoiseReduction = (data: Uint8ClampedArray, width: number, height: number, strength: number = 0.5) => {
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
const adjustChannelCurve = (value: number, strength: number): number => {
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
const applySCurve = (value: number, strength: number): number => {
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

/**
 * Convert RGB to HSL
 * @param r Red channel (0-255)
 * @param g Green channel (0-255) 
 * @param b Blue channel (0-255)
 * @returns HSL values (h: 0-360, s: 0-1, l: 0-1)
 */
const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    
    h *= 60;
  }
  
  return { h, s, l };
};

/**
 * Convert HSL to RGB
 * @param h Hue (0-360)
 * @param s Saturation (0-1)
 * @param l Lightness (0-1) 
 * @returns RGB values (r, g, b: 0-255)
 */
const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, (h / 360) + 1/3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, (h / 360) - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
};

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

/**
 * Process an image based on the selected processing type
 * @param imageUrl URL of the image to process
 * @param processingType Type of processing to apply
 * @param options Additional options for processing
 * @returns Promise resolving to the processed image URL
 */
export const processImage = async (
  imageUrl: string,
  processingType: string,
  options?: NegativeConversionOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Handle CORS issues
    
    img.onload = () => {
      // Create canvas to manipulate the image
      const canvas = document.createElement("canvas");
      
      // Preserve original image dimensions to avoid resolution loss
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext("2d", { 
        willReadFrequently: true,
        alpha: false, // Disable alpha for better performance
      });
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      // Apply image-rendering to maintain quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw image to canvas with proper dimensions
      ctx.drawImage(img, 0, 0, img.width, img.height);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Apply processing based on type
      let processedData: ImageData;
      
      console.log(`Processing with ${processingType}:`, options);
      
      switch (processingType) {
        case "negative-conversion":
          processedData = convertNegativeToPositive(imageData, options);
          break;
        default:
          // If no valid processing type is provided, return the original
          resolve(imageUrl);
          return;
      }
      
      // Put processed data back to canvas
      ctx.putImageData(processedData, 0, 0);
      
      // Get processed image as URL with higher quality
      const processedImageUrl = canvas.toDataURL("image/jpeg", 0.95); // Higher quality JPEG
      resolve(processedImageUrl);
    };
    
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    
    img.src = imageUrl;
  });
};

// List of available processing types
export const processingTypes = [
  { value: "none", label: "No Processing" },
  { value: "negative-conversion", label: "Negative to Positive Conversion" },
]; 