import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function PixelButton({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md',
  isLoading = false,
  disabled,
  ...props 
}: PixelButtonProps) {
  const baseStyles = "font-bold uppercase transition-all active:translate-y-1 active:shadow-none border-4 border-gray-900 flex items-center justify-center gap-2";
  
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
      className={twMerge(
        baseStyles, 
        variants[variant], 
        sizes[size], 
        (disabled || isLoading) && "opacity-70 cursor-not-allowed shadow-none translate-y-1 active:translate-y-1",
        className
      )} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="animate-spin inline-block w-4 h-4 border-4 border-current border-t-transparent rounded-full mr-2"></span>
          Loading...
        </>
      ) : children}
    </button>
  );
}
