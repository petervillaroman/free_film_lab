import { useState, useRef, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import ProcessingSelector from "~/components/ProcessingSelector";
import ToggleSwitch from "~/components/ToggleSwitch";
import ColorDropper from "~/components/ColorDropper";
import { processImage, type NegativeConversionOptions } from "~/utils/imageProcessing";

export const meta: MetaFunction = () => {
  return [
    { title: "Free Film Lab" },
    { name: "description", content: "Upload and process your film photos" },
  ];
};

export default function Index() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [processingType, setProcessingType] = useState<string>("none");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(false);
  const [useBorderSampling, setUseBorderSampling] = useState<boolean>(false);
  const [useManualSelection, setUseManualSelection] = useState<boolean>(false);
  const [isColorPickerActive, setIsColorPickerActive] = useState<boolean>(false);
  const [conversionOptions, setConversionOptions] = useState<NegativeConversionOptions>({
    filmBaseColor: { r: 220, g: 150, b: 130 },
    channelAdjustments: { r: 1.0, g: 0.8, b: 0.7 },
    baseSubtractionOpacity: 0.8,
    contrastBoost: 1.1,
    cyanAdjustment: { hue: 10, saturation: 0.8, lightness: 0.1 }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process the image whenever the original image, processing type, or conversion options change
  useEffect(() => {
    const applyProcessing = async () => {
      if (!originalImage) return;
      
      try {
        setIsProcessing(true);
        // If no processing is selected, just use the original
        if (processingType === "none") {
          setProcessedImage(originalImage);
          return;
        }
        
        // Apply the selected processing
        const options = { 
          ...conversionOptions,
          useBorderSampling: useBorderSampling && !useManualSelection
        };
          
        console.log('Processing with options:', options);
          
        const processed = await processImage(
          originalImage, 
          processingType, 
          options
        );
        setProcessedImage(processed);
      } catch (error) {
        console.error("Processing error:", error);
        // In case of error, fall back to the original
        setProcessedImage(originalImage);
      } finally {
        setIsProcessing(false);
      }
    };

    // Only apply processing if not currently picking colors
    if (!isColorPickerActive) {
      applyProcessing();
    }
  }, [
    originalImage, 
    processingType, 
    useBorderSampling, 
    useManualSelection, 
    isColorPickerActive,
    // Include specific parts of conversionOptions that affect negative conversion
    conversionOptions.filmBaseColor,
    conversionOptions.baseSubtractionOpacity,
    conversionOptions.channelAdjustments,
    conversionOptions.contrastBoost,
    conversionOptions.cyanAdjustment
  ]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target?.result) {
          setOriginalImage(e.target.result as string);
          // Initial processing will be applied via the useEffect
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleProcessingChange = (newType: string) => {
    setProcessingType(newType);
    setShowAdvancedControls(newType === "negative-conversion");
  };

  const handleBorderSamplingToggle = (checked: boolean) => {
    setUseBorderSampling(checked);
    if (checked) {
      setUseManualSelection(false);
    }
  };

  const handleManualSelectionToggle = (checked: boolean) => {
    setUseManualSelection(checked);
    if (checked) {
      setUseBorderSampling(false);
      // Activate color picker when manual selection is turned on
      setIsColorPickerActive(true);
    } else {
      setIsColorPickerActive(false);
    }
  };

  const handleColorSelected = (color: { r: number; g: number; b: number }) => {
    // Log the selected color to help with debugging
    console.log('Selected film border color:', color);
    
    // Update the film base color in conversion options
    setConversionOptions(prev => ({
      ...prev,
      filmBaseColor: color
    }));
    
    // Force reprocessing by creating a temporary state change
    setIsProcessing(true);
  };

  const handleColorPickerComplete = () => {
    setIsColorPickerActive(false);
    
    // Trigger image reprocessing after color picker is deactivated
    if (useManualSelection) {
      // Small delay to ensure UI updates before processing starts
      setTimeout(() => {
        const options = { 
          ...conversionOptions,
          useBorderSampling: false
        };
          
        processImage(originalImage!, processingType, options)
          .then(processed => {
            setProcessedImage(processed);
            setIsProcessing(false);
          })
          .catch(error => {
            console.error("Processing error:", error);
            setIsProcessing(false);
          });
      }, 100);
    }
  };

  const handleOptionChange = (
    category: keyof NegativeConversionOptions,
    value: number | { r: number; g: number; b: number } | { hue: number; saturation: number; lightness: number },
    subcategory?: string
  ) => {
    setConversionOptions(prev => {
      if (subcategory && typeof prev[category] === 'object') {
        return {
          ...prev,
          [category]: {
            ...prev[category],
            [subcategory]: value
          }
        };
      }
      return {
        ...prev,
        [category]: value
      };
    });
  };

  const handleAdvancedControlsToggle = (checked: boolean) => {
    setShowAdvancedControls(checked);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <div className="max-w-4xl w-full flex flex-col items-center gap-8">
        {/* Welcome Banner */}
        <header className="w-full text-center mb-4 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100">
            Welcome to Free Film Lab
          </h1>
        </header>

        {/* Image Upload Button */}
        <div className="w-full flex justify-center my-4 sm:my-8">
          <button 
            onClick={handleUploadClick}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 sm:py-3 sm:px-6 rounded-lg cursor-pointer transition-colors"
          >
            Upload Your Film Photos
            <input 
              ref={fileInputRef}
              onChange={handleFileChange}
              type="file" 
              accept="image/*" 
              className="hidden" 
            />
          </button>
        </div>

        {/* Processing Section - Modified to have side-by-side layout on desktop */}
        {originalImage && (
          <div className="w-full flex flex-col lg:flex-row gap-6 mb-6">
            {/* Left side: Controls */}
            <div className="w-full lg:w-1/3">
              <ProcessingSelector
                selectedType={processingType}
                onChange={handleProcessingChange}
              />
              
              {/* Negative Conversion Controls */}
              {processingType === "negative-conversion" && (
                <div className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mt-2">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
                    Negative to Positive Conversion
                  </h3>
                  
                  <div className="flex flex-col gap-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Film Border Selection
                    </h4>
                    
                    <ToggleSwitch
                      label="Auto Sample Film Border"
                      checked={useBorderSampling}
                      onChange={handleBorderSamplingToggle}
                      description="Automatically sample the edges of the image to determine the film base color"
                    />
                    
                    <ToggleSwitch
                      label="Manual Film Border Selection"
                      checked={useManualSelection}
                      onChange={handleManualSelectionToggle}
                      description="Manually select film border area to sample the base color"
                    />
                    
                    {useManualSelection && !isColorPickerActive && (
                      <div className="mt-2 mb-4">
                        <button
                          onClick={() => setIsColorPickerActive(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded text-sm"
                        >
                          Pick Film Border Color
                        </button>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <div 
                            className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded" 
                            style={{ 
                              backgroundColor: `rgb(${conversionOptions.filmBaseColor?.r}, ${conversionOptions.filmBaseColor?.g}, ${conversionOptions.filmBaseColor?.b})` 
                            }}
                          />
                          <span className="text-xs font-mono">
                            RGB({conversionOptions.filmBaseColor?.r}, {conversionOptions.filmBaseColor?.g}, {conversionOptions.filmBaseColor?.b})
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Show recently applied color notification */}
                    {useManualSelection && !isColorPickerActive && (
                      <div className="mt-2 p-2 mb-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm rounded">
                        <p className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Film base color applied. If you want to select a different area, click &quot;Pick Film Border Color&quot; again.
                        </p>
                      </div>
                    )}
                    
                    <ToggleSwitch
                      label="Show Fine-Tuning Controls"
                      checked={showAdvancedControls}
                      onChange={handleAdvancedControlsToggle}
                      description="Show additional controls based on Alex Burke&apos;s method"
                    />
                    
                    {showAdvancedControls && (
                      <div className="mt-4">
                        {/* Film Base Subtraction Controls */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Film Base Subtraction
                          </h4>
                          <div>
                            <label 
                              htmlFor="base-subtraction" 
                              className="block text-xs text-gray-600 dark:text-gray-400"
                            >
                              Opacity
                            </label>
                            <input 
                              id="base-subtraction"
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.05"
                              value={conversionOptions.baseSubtractionOpacity} 
                              onChange={(e) => handleOptionChange('baseSubtractionOpacity', parseFloat(e.target.value))}
                              className="w-full"
                            />
                            <div className="text-xs text-center">{conversionOptions.baseSubtractionOpacity?.toFixed(2)}</div>
                          </div>
                        </div>
                        
                        {/* Channel Adjustments */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Channel Adjustments
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label 
                                htmlFor="channel-r" 
                                className="block text-xs text-gray-600 dark:text-gray-400"
                              >
                                Red
                              </label>
                              <input 
                                id="channel-r"
                                type="range" 
                                min="0.5" 
                                max="1.5" 
                                step="0.05"
                                value={conversionOptions.channelAdjustments?.r} 
                                onChange={(e) => handleOptionChange('channelAdjustments', parseFloat(e.target.value), 'r')}
                                className="w-full"
                              />
                              <div className="text-xs text-center">{conversionOptions.channelAdjustments?.r.toFixed(2)}</div>
                            </div>
                            <div>
                              <label 
                                htmlFor="channel-g" 
                                className="block text-xs text-gray-600 dark:text-gray-400"
                              >
                                Green
                              </label>
                              <input 
                                id="channel-g"
                                type="range" 
                                min="0.5" 
                                max="1.5" 
                                step="0.05"
                                value={conversionOptions.channelAdjustments?.g} 
                                onChange={(e) => handleOptionChange('channelAdjustments', parseFloat(e.target.value), 'g')}
                                className="w-full"
                              />
                              <div className="text-xs text-center">{conversionOptions.channelAdjustments?.g.toFixed(2)}</div>
                            </div>
                            <div>
                              <label 
                                htmlFor="channel-b" 
                                className="block text-xs text-gray-600 dark:text-gray-400"
                              >
                                Blue
                              </label>
                              <input 
                                id="channel-b"
                                type="range" 
                                min="0.5" 
                                max="1.5" 
                                step="0.05"
                                value={conversionOptions.channelAdjustments?.b} 
                                onChange={(e) => handleOptionChange('channelAdjustments', parseFloat(e.target.value), 'b')}
                                className="w-full"
                              />
                              <div className="text-xs text-center">{conversionOptions.channelAdjustments?.b.toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <p>According to Alex Burke&apos;s method: reduce blue significantly, green moderately, red minimally.</p>
                          </div>
                        </div>
                        
                        {/* Contrast Boost */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Contrast Boost
                          </h4>
                          <div>
                            <input 
                              type="range" 
                              min="0.8" 
                              max="1.5" 
                              step="0.05"
                              value={conversionOptions.contrastBoost} 
                              onChange={(e) => handleOptionChange('contrastBoost', parseFloat(e.target.value))}
                              className="w-full"
                            />
                            <div className="text-xs text-center">{conversionOptions.contrastBoost?.toFixed(2)}</div>
                          </div>
                        </div>
                        
                        {/* Cyan Adjustments */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Cyan Adjustment
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label 
                                htmlFor="cyan-hue" 
                                className="block text-xs text-gray-600 dark:text-gray-400"
                              >
                                Hue Shift
                              </label>
                              <input 
                                id="cyan-hue"
                                type="range" 
                                min="-30" 
                                max="30" 
                                step="1"
                                value={conversionOptions.cyanAdjustment?.hue} 
                                onChange={(e) => handleOptionChange('cyanAdjustment', parseInt(e.target.value), 'hue')}
                                className="w-full"
                              />
                              <div className="text-xs text-center">{conversionOptions.cyanAdjustment?.hue}</div>
                            </div>
                            <div>
                              <label 
                                htmlFor="cyan-saturation"
                                className="block text-xs text-gray-600 dark:text-gray-400"
                              >
                                Saturation
                              </label>
                              <input 
                                id="cyan-saturation"
                                type="range" 
                                min="0.5" 
                                max="1.5" 
                                step="0.05"
                                value={conversionOptions.cyanAdjustment?.saturation} 
                                onChange={(e) => handleOptionChange('cyanAdjustment', parseFloat(e.target.value), 'saturation')}
                                className="w-full"
                              />
                              <div className="text-xs text-center">{conversionOptions.cyanAdjustment?.saturation.toFixed(2)}</div>
                            </div>
                            <div>
                              <label 
                                htmlFor="cyan-lightness"
                                className="block text-xs text-gray-600 dark:text-gray-400"
                              >
                                Lightness
                              </label>
                              <input 
                                id="cyan-lightness"
                                type="range" 
                                min="-0.2" 
                                max="0.2" 
                                step="0.01"
                                value={conversionOptions.cyanAdjustment?.lightness} 
                                onChange={(e) => handleOptionChange('cyanAdjustment', parseFloat(e.target.value), 'lightness')}
                                className="w-full"
                              />
                              <div className="text-xs text-center">{conversionOptions.cyanAdjustment?.lightness.toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <p>Alex Burke recommends adjusting cyan towards blue and reducing its saturation.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Image Processing Status */}
              {isProcessing && !isColorPickerActive && (
                <div className="w-full bg-blue-50 dark:bg-blue-900 p-3 rounded-lg mt-2 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                    <p className="text-blue-700 dark:text-blue-300">Processing image with new settings...</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right side: Image Comparison */}
            <div className="w-full lg:w-2/3 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-center mb-4 text-gray-800 dark:text-gray-100">
                Image Comparison
              </h2>
              
              <div className="flex flex-col gap-4 w-full">
                {/* Original Image */}
                <div className="flex-1 flex flex-col items-center">
                  <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Original</p>
                  <div className="w-full bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 overflow-hidden">
                    {isColorPickerActive ? (
                      <ColorDropper
                        imageUrl={originalImage}
                        onColorSelected={handleColorSelected}
                        isActive={isColorPickerActive}
                        onComplete={handleColorPickerComplete}
                      />
                    ) : (
                      <img 
                        src={originalImage} 
                        alt="Original uploaded" 
                        className="w-full h-auto object-contain max-h-[300px]"
                      />
                    )}
                  </div>
                </div>
                
                {/* Processed Image */}
                {processedImage && (
                  <div className="flex-1 flex flex-col items-center">
                    <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      {isProcessing ? "Processing..." : "Processed Result"}
                    </p>
                    <div className="w-full bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 overflow-hidden relative">
                      {isProcessing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                      )}
                      <img 
                        src={processedImage} 
                        alt="Processed result" 
                        className="w-full h-auto object-contain max-h-[300px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="prose dark:prose-invert max-w-3xl text-center">
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300">
            Free Film Lab is a virtual darkroom for your analog photography needs. We provide tools to process, edit, and share your film photos 
            without any cost. Upload your scanned negatives and convert them to positives with our intelligent processing algorithms.
          </p>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300">
            Our negative conversion tool follows Alex Burke&apos;s professional techniques for handling color negative film&apos;s orange mask, 
            providing you with natural-looking results that preserve the unique characteristics of your film stock.
          </p>
        </div>
      </div>
    </div>
  );
}
