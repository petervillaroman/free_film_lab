import { useState, useRef, useEffect } from "react";

interface ColorDropperProps {
  imageUrl: string;
  onColorSelected: (color: { r: number; g: number; b: number }) => void;
  isActive: boolean;
  onComplete: () => void;
}

export default function ColorDropper({ 
  imageUrl, 
  onColorSelected, 
  isActive,
  onComplete
}: ColorDropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewColor, setPreviewColor] = useState({ r: 0, g: 0, b: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Setup canvas when image changes
  useEffect(() => {
    if (!imageUrl) return;
    
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Handle mouse movement over canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
    
    setMousePosition({ x, y });
    
    // Get pixel color data
    const pixelData = ctx.getImageData(x, y, 1, 1).data;
    const color = { r: pixelData[0], g: pixelData[1], b: pixelData[2] };
    setPreviewColor(color);
    setIsHovering(true);
  };
  
  const handleMouseLeave = () => {
    setIsHovering(false);
  };
  
  const handleClick = () => {
    if (!isActive) return;
    onColorSelected(previewColor);
    onComplete();
  };

  return (
    <div className="relative w-full cursor-crosshair">
      
      
      <canvas 
        ref={canvasRef}
        className={`w-full h-auto object-contain ${isActive ? 'cursor-crosshair' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      
      {isActive && isHovering && (
        <div 
          className="absolute z-10 flex items-center gap-2 bg-white dark:bg-gray-800 shadow-md rounded-md p-2 border border-gray-200 dark:border-gray-700"
          style={{ 
            left: `${mousePosition.x}px`, 
            top: `${mousePosition.y + 20}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div 
            className="w-6 h-6 border border-gray-300 dark:border-gray-600" 
            style={{ backgroundColor: `rgb(${previewColor.r}, ${previewColor.g}, ${previewColor.b})` }}
          />
          <span className="text-xs font-mono">
            RGB({previewColor.r}, {previewColor.g}, {previewColor.b})
          </span>
        </div>
      )}
    </div>
  );
} 