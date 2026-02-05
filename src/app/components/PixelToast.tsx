import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function PixelToast({ 
  message, 
  type = 'info', 
  isVisible, 
  onClose,
  duration = 3000 
}: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const bgColors = {
    success: 'bg-[#92cc41] text-white',
    error: 'bg-[#ff6b6b] text-white',
    info: 'bg-[#4ecdc4] text-black',
  };
  
  const icons = {
    success: <CheckCircle className="w-6 h-6" />,
    error: <AlertCircle className="w-6 h-6" />,
    info: <Info className="w-6 h-6" />,
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className={twMerge(
        "flex items-center gap-3 px-6 py-4 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]",
        bgColors[type]
      )}>
        <div className="bg-black/10 p-1 rounded-sm border-2 border-black/20">
          {icons[type]}
        </div>
        <div className="font-bold text-lg font-mono">
          {message}
        </div>
        <button 
          onClick={onClose}
          className="ml-4 hover:bg-black/20 p-1 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
