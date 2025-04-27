/**
 * Main image processing module
 */
import { convertNegativeToPositive } from './negativeConverter';
import type { NegativeConversionOptions } from './types';

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