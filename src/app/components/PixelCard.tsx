import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface PixelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
}

export function PixelCard({ 
  children, 
  className, 
  variant = 'default',
  ...props 
}: PixelCardProps) {
  const baseStyles = "bg-white p-6 relative border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(32,32,32,1)]";
  
  const variants = {
    default: "bg-white",
    primary: "bg-[#ffcd38]",
    secondary: "bg-[#ff6b6b] text-white",
    accent: "bg-[#4ecdc4]",
  };

  return (
    <div 
      className={twMerge(baseStyles, variants[variant], className)} 
      {...props}
    >
      {children}
    </div>
  );
}
