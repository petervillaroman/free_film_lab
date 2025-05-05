import { useState } from 'react';

export function useDownloadManager() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadElapsed, setDownloadElapsed] = useState(0);
  const [downloadStartTime, setDownloadStartTime] = useState(0);

  const downloadFile = (url: string, filename: string) => {
    if (typeof window === 'undefined') return;

    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      setDownloadElapsed(0);
      setDownloadStartTime(Date.now());

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);

      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          const newProgress = prev + (100 - prev) * 0.1;
          if (newProgress >= 99) {
            clearInterval(progressInterval);
            return 100;
          }
          return newProgress;
        });
        setDownloadElapsed((Date.now() - downloadStartTime) / 1000);
      }, 100);

      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        clearInterval(progressInterval);
        setDownloadProgress(100);
        setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress(0);
        }, 1000);
      }, 1000);
    } catch (error) {
      console.error("Download error:", error);
      setIsDownloading(false);
    }
  };

  return {
    isDownloading,
    downloadProgress,
    downloadElapsed,
    downloadFile,
  };
} 