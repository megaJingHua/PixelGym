import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function PixelButton({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md',
  ...props 
}: PixelButtonProps) {
  const baseStyles = "font-bold uppercase transition-all active:translate-y-1 active:shadow-none border-4 border-gray-900 cursor-pointer flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-[#ffcd38] hover:bg-[#ffdb70] text-gray-900 shadow-[4px_4px_0px_0px_rgba(32,32,32,1)]",
    secondary: "bg-[#ff6b6b] hover:bg-[#ff8585] text-white shadow-[4px_4px_0px_0px_rgba(32,32,32,1)]",
    accent: "bg-[#4ecdc4] hover:bg-[#70e0d9] text-gray-900 shadow-[4px_4px_0px_0px_rgba(32,32,32,1)]",
    outline: "bg-transparent border-gray-900 text-gray-900 shadow-[4px_4px_0px_0px_rgba(32,32,32,1)] hover:bg-gray-100",
    ghost: "bg-transparent border-transparent shadow-none hover:bg-gray-100",
  };

  const sizes = {
    sm: "text-xs px-3 py-1",
    md: "text-sm px-6 py-2",
    lg: "text-lg px-8 py-4",
  };

  return (
    <button 
      className={twMerge(baseStyles, variants[variant], sizes[size], className)} 
      {...props}
    >
      {children}
    </button>
  );
}
