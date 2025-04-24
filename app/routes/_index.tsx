import { useState, useRef, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import ProcessingSelector from "~/components/ProcessingSelector";
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
  const [conversionOptions, setConversionOptions] = useState<NegativeConversionOptions>({
    filmBaseColor: { r: 220, g: 150, b: 130 },
    channelAdjustments: { r: 1.0, g: 0.8, b: 0.7 },
    baseSubtractionOpacity: 0.8,
    contrastBoost: 1.1
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
        const processed = await processImage(
          originalImage, 
          processingType, 
          processingType === "advanced-negative-conversion" ? conversionOptions : undefined
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

    applyProcessing();
  }, [originalImage, processingType, conversionOptions]);

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
    setShowAdvancedControls(newType === "advanced-negative-conversion");
  };

  const handleOptionChange = (
    category: keyof NegativeConversionOptions,
    value: number | { r: number; g: number; b: number },
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

        {/* Processing Selector */}
        {originalImage && (
          <div className="w-full flex flex-col items-center gap-4 mb-6">
            <ProcessingSelector
              selectedType={processingType}
              onChange={handleProcessingChange}
            />
            
            {/* Advanced Controls Panel */}
            {showAdvancedControls && (
              <div className="w-full max-w-md bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mt-2">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
                  Advanced Negative Conversion Settings
                </h3>
                
                {/* Film Base Color Controls */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Film Base Color
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label 
                        htmlFor="film-base-r" 
                        className="block text-xs text-gray-600 dark:text-gray-400"
                      >
                        Red
                      </label>
                      <input 
                        id="film-base-r"
                        type="range" 
                        min="0" 
                        max="255" 
                        value={conversionOptions.filmBaseColor?.r} 
                        onChange={(e) => handleOptionChange('filmBaseColor', parseInt(e.target.value), 'r')}
                        className="w-full"
                      />
                      <div className="text-xs text-center">{conversionOptions.filmBaseColor?.r}</div>
                    </div>
                    <div>
                      <label 
                        htmlFor="film-base-g" 
                        className="block text-xs text-gray-600 dark:text-gray-400"
                      >
                        Green
                      </label>
                      <input 
                        id="film-base-g"
                        type="range" 
                        min="0" 
                        max="255" 
                        value={conversionOptions.filmBaseColor?.g} 
                        onChange={(e) => handleOptionChange('filmBaseColor', parseInt(e.target.value), 'g')}
                        className="w-full"
                      />
                      <div className="text-xs text-center">{conversionOptions.filmBaseColor?.g}</div>
                    </div>
                    <div>
                      <label 
                        htmlFor="film-base-b" 
                        className="block text-xs text-gray-600 dark:text-gray-400"
                      >
                        Blue
                      </label>
                      <input 
                        id="film-base-b"
                        type="range" 
                        min="0" 
                        max="255" 
                        value={conversionOptions.filmBaseColor?.b} 
                        onChange={(e) => handleOptionChange('filmBaseColor', parseInt(e.target.value), 'b')}
                        className="w-full"
                      />
                      <div className="text-xs text-center">{conversionOptions.filmBaseColor?.b}</div>
                    </div>
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
                </div>
                
                {/* Other Controls */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label 
                      htmlFor="base-subtraction" 
                      className="block text-sm text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Base Subtraction
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
                  <div>
                    <label 
                      htmlFor="contrast-boost" 
                      className="block text-sm text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Contrast
                    </label>
                    <input 
                      id="contrast-boost"
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
              </div>
            )}
          </div>
        )}

        {/* Image Comparison Display */}
        {originalImage && processedImage && (
          <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold text-center mb-4 text-gray-800 dark:text-gray-100">
              Image Comparison
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <div className="flex-1 flex flex-col items-center">
                <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Original</p>
                <div className="w-full bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <img 
                    src={originalImage} 
                    alt="Original uploaded" 
                    className="w-full h-auto object-contain max-h-[300px]"
                  />
                </div>
              </div>
              
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
            Our advanced negative conversion tool follows professional techniques for handling color negative film&apos;s orange mask, 
            providing you with natural-looking results that preserve the unique characteristics of your film stock.
          </p>
        </div>
      </div>
    </div>
  );
}
