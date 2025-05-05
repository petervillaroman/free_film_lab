import { useState, useEffect } from 'react';
import { processImage, type NegativeConversionOptions } from '~/utils/imageProcessing/index';

const initialConversionOptions: NegativeConversionOptions = {
  filmBaseColor: { r: 220, g: 150, b: 130 },
  channelAdjustments: { r: 1.0, g: 0.8, b: 0.7 },
  baseSubtractionOpacity: 0.8,
  contrastBoost: 1.1,
  cyanAdjustment: { hue: 10, saturation: 0.8, lightness: 0.1 },
};

export function useImageProcessing() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [originalFilename, setOriginalFilename] = useState<string | null>(null);
  const [processingType, setProcessingType] = useState<string>("none");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [useBorderSampling, setUseBorderSampling] = useState<boolean>(false);
  const [useManualSelection, setUseManualSelection] = useState<boolean>(false);
  const [isColorPickerActive, setIsColorPickerActive] = useState<boolean>(false);
  const [conversionOptions, setConversionOptions] = useState<NegativeConversionOptions>(initialConversionOptions);

  // Process the image whenever relevant state changes
  useEffect(() => {
    const applyProcessing = async () => {
      if (!originalImage) {
        setProcessedImage(null); // Clear processed image if original is removed
        return;
      }
      if (isColorPickerActive) {
        return; // Don't reprocess while color picker is active
      }

      try {
        setIsProcessing(true);
        if (processingType === "none") {
          setProcessedImage(originalImage);
          return;
        }

        const options = { 
          ...conversionOptions,
          // Only use border sampling if it's toggled on AND manual selection is off
          useBorderSampling: useBorderSampling && !useManualSelection,
          // Use manually selected color only if manual selection is toggled on
          filmBaseColor: useManualSelection ? conversionOptions.filmBaseColor : undefined,
        };
        
        console.log('Processing with options:', options); // Keep for debugging
          
        const processed = await processImage(
          originalImage, 
          processingType, 
          options
        );
        setProcessedImage(processed);
      } catch (error) {
        console.error("Processing error:", error);
        setProcessedImage(originalImage); // Fallback on error
      } finally {
        setIsProcessing(false);
      }
    };

    applyProcessing();
    
  }, [
    originalImage, 
    processingType, 
    useBorderSampling, 
    useManualSelection, 
    isColorPickerActive,
    conversionOptions, // Monitor the whole object for simplicity now
  ]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      setOriginalFilename(file.name);
      reader.onload = (e) => {
        if (e.target?.result) {
          setOriginalImage(e.target.result as string);
          // Reset options when new image is loaded?
          // setConversionOptions(initialConversionOptions);
          // setUseBorderSampling(false);
          // setUseManualSelection(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualSelectionToggle = (checked: boolean) => {
    setUseManualSelection(checked);
    if (checked) {
      setUseBorderSampling(false);
      setIsColorPickerActive(true);
    } else {
      setIsColorPickerActive(false);
    }
  };

  const handleColorSelected = (color: { r: number; g: number; b: number }) => {
    setConversionOptions((prev) => ({
      ...prev,
      filmBaseColor: color
    }));
    // Color picker completion will handle reprocessing
  };

  const handleColorPickerComplete = () => {
    setIsColorPickerActive(false);
    // Reprocessing is triggered by useEffect dependency change on isColorPickerActive
  };

  const handleOptionChange = (
    category: keyof NegativeConversionOptions,
    value: number | { r: number; g: number; b: number } | { hue: number; saturation: number; lightness: number },
    subcategory?: string
  ) => {
    setConversionOptions((prev) => {
      const currentCategory = prev[category];
      if (subcategory && typeof currentCategory === 'object' && currentCategory !== null) {
        // Handle nested objects like filmBaseColor, channelAdjustments, cyanAdjustment
        return {
          ...prev,
          [category]: {
            ...(currentCategory as object), // Type assertion
            [subcategory]: value
          }
        };
      } else if (!subcategory) {
        // Handle direct properties like baseSubtractionOpacity, contrastBoost
        return {
          ...prev,
          [category]: value
        };
      }
      return prev; // Should not happen if called correctly
    });
  };

  return {
    originalImage,
    processedImage,
    originalFilename,
    processingType,
    setProcessingType,
    isProcessing,
    useBorderSampling,
    setUseBorderSampling,
    useManualSelection,
    handleManualSelectionToggle,
    isColorPickerActive,
    setIsColorPickerActive, // Expose if needed by UI component
    conversionOptions,
    handleFileChange,
    handleColorSelected,
    handleColorPickerComplete,
    handleOptionChange,
  };
} 