/**
 * Utility functions for image processing
 */

/**
 * Convert a negative film image to a positive image
 * Based on Alex Burke's manual inversion technique:
 * https://www.alexburkephoto.com/blog/2019/10/16/manual-inversion-of-color-negative-film
 * 
 * @param imageData The source image data (from canvas)
 * @returns Processed image data
 */
export const convertNegativeToPositive = (imageData: ImageData): ImageData => {
  const { width, height, data } = imageData;
  // Create a copy of the image data
  const processedData = new Uint8ClampedArray(data);
  
  // STEP 1: Find the film base color (typically orange-brown)
  // In a real application, we would sample the film border
  // For simplicity, let's use an estimate of a typical color negative film base
  const filmBaseR = 220; // Orange-brown base typical values
  const filmBaseG = 150;
  const filmBaseB = 130;
  
  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    // STEP 2: Invert RGB values (basic inversion)
    let r = 255 - data[i];
    let g = 255 - data[i + 1];
    let b = 255 - data[i + 2];
    
    // STEP 3: Subtract film base (using the "subtract" blend mode concept)
    // This helps neutralize the orange mask
    r = Math.max(0, r - (255 - filmBaseR) * 0.8); // Using 0.8 as opacity like in the article
    g = Math.max(0, g - (255 - filmBaseG) * 0.8);
    b = Math.max(0, b - (255 - filmBaseB) * 0.8);
    
    // STEP 4: Channel-specific adjustments (similar to curves adjustment)
    // Typically blue needs to be reduced more, green by a good amount, red less so
    // These values are approximations of the typical curve adjustments mentioned in the article
    r = adjustChannel(r, 1.0, 5);   // Minimal adjustment to red
    g = adjustChannel(g, 0.8, 0);   // Reduce green moderately
    b = adjustChannel(b, 0.7, -5);  // Reduce blue significantly
    
    // Store the processed values
    processedData[i] = r;
    processedData[i + 1] = g;
    processedData[i + 2] = b;
    // Alpha channel remains unchanged
  }
  
  return new ImageData(processedData, width, height);
};

/**
 * Helper function to adjust a color channel with curve-like adjustments
 * @param value The input channel value (0-255)
 * @param strength Multiplier for the channel (0-1)
 * @param offset Value to add/subtract from the channel
 * @returns Adjusted channel value
 */
const adjustChannel = (value: number, strength: number, offset: number): number => {
  // Apply strength (similar to curves adjustment)
  let result = value * strength;
  
  // Apply offset
  result += offset;
  
  // Ensure the result is within 0-255 range
  return Math.max(0, Math.min(255, result));
};

/**
 * Advanced negative to positive conversion with additional controls
 * @param imageData The source image data
 * @param options Configuration options for the conversion
 * @returns Processed image data
 */
export const advancedNegativeConversion = (
  imageData: ImageData,
  options: NegativeConversionOptions = {}
): ImageData => {
  const {
    filmBaseColor = { r: 220, g: 150, b: 130 },
    channelAdjustments = { r: 1.0, g: 0.8, b: 0.7 },
    baseSubtractionOpacity = 0.8,
    contrastBoost = 1.1
  } = options;
  
  const { width, height, data } = imageData;
  const processedData = new Uint8ClampedArray(data);
  
  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    // Invert RGB values
    let r = 255 - data[i];
    let g = 255 - data[i + 1];
    let b = 255 - data[i + 2];
    
    // Subtract film base
    r = Math.max(0, r - (255 - filmBaseColor.r) * baseSubtractionOpacity);
    g = Math.max(0, g - (255 - filmBaseColor.g) * baseSubtractionOpacity);
    b = Math.max(0, b - (255 - filmBaseColor.b) * baseSubtractionOpacity);
    
    // Apply channel-specific adjustments
    r = adjustChannel(r, channelAdjustments.r, 0);
    g = adjustChannel(g, channelAdjustments.g, 0);
    b = adjustChannel(b, channelAdjustments.b, 0);
    
    // Apply contrast boost (S-curve approximation)
    r = applyContrast(r, contrastBoost);
    g = applyContrast(g, contrastBoost);
    b = applyContrast(b, contrastBoost);
    
    // Store the processed values
    processedData[i] = r;
    processedData[i + 1] = g;
    processedData[i + 2] = b;
  }
  
  return new ImageData(processedData, width, height);
};

/**
 * Apply contrast adjustment (simple S-curve approximation)
 * @param value Channel value (0-255)
 * @param strength Contrast strength
 * @returns Adjusted value
 */
const applyContrast = (value: number, strength: number): number => {
  // Convert to 0-1 range
  const normalized = value / 255;
  
  // Apply S-curve (simple approximation)
  // This pushes mid-tones toward extremes for more contrast
  const adjusted = 0.5 + (normalized - 0.5) * strength;
  
  // Convert back to 0-255 range and clamp
  return Math.max(0, Math.min(255, adjusted * 255));
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
  // Channel-specific strength adjustments (0-1)
  channelAdjustments?: {
    r: number;
    g: number;
    b: number;
  };
  // Opacity for film base subtraction (0-1)
  baseSubtractionOpacity?: number;
  // Contrast boost factor
  contrastBoost?: number;
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
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Apply processing based on type
      let processedData: ImageData;
      
      switch (processingType) {
        case "negative-conversion":
          processedData = convertNegativeToPositive(imageData);
          break;
        case "advanced-negative-conversion":
          processedData = advancedNegativeConversion(imageData, options);
          break;
        default:
          // If no valid processing type is provided, return the original
          resolve(imageUrl);
          return;
      }
      
      // Put processed data back to canvas
      ctx.putImageData(processedData, 0, 0);
      
      // Get processed image as URL
      const processedImageUrl = canvas.toDataURL("image/jpeg");
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
  { value: "negative-conversion", label: "Basic Negative Conversion" },
  { value: "advanced-negative-conversion", label: "Advanced Negative Conversion" },
]; 