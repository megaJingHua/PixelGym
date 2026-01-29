import React from 'react';
import { twMerge } from 'tailwind-merge';

export function PixelBadge({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'success' | 'warning' }) {
  const variants = {
    default: "bg-gray-200 text-gray-800",
    success: "bg-[#4ecdc4] text-gray-900",
    warning: "bg-[#ffcd38] text-gray-900"
  };

  return (
    <span className={twMerge("px-2 py-0.5 border-2 border-gray-900 text-xs font-bold uppercase", variants[variant], className)}>
      {children}
    </span>
  );
}
