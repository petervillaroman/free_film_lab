import React from 'react';

interface ImageDisplayCardProps {
  title: string;
  children: React.ReactNode; // To allow passing img or ColorDropper
  showDownloadButton?: boolean;
  onDownload?: () => void;
  isDownloadDisabled?: boolean;
  isLoading?: boolean; // Added for the loading spinner
}

export default function ImageDisplayCard({
  title,
  children,
  showDownloadButton = false,
  onDownload,
  isDownloadDisabled = false,
  isLoading = false
}: ImageDisplayCardProps) {
  return (
    <div className="flex-1 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
        </p>
        {showDownloadButton && onDownload && (
          <button
            onClick={onDownload}
            disabled={isDownloadDisabled}
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 
                      text-white font-medium py-1 px-2 text-xs rounded-lg cursor-pointer transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </button>
        )}
      </div>
      <div className="w-full bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        {/* Render the image or ColorDropper passed as children */}
        {children}
      </div>
    </div>
  );
} 