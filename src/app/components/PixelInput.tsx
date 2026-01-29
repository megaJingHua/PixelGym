import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface PixelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function PixelInput({ 
  className, 
  label,
  id,
  ...props 
}: PixelInputProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label htmlFor={id} className="font-bold text-gray-900 uppercase text-sm">
          {label}
        </label>
      )}
      <input 
        id={id}
        className={twMerge(
          "bg-white border-4 border-gray-900 p-3 outline-none focus:shadow-[4px_4px_0px_0px_#4ecdc4] transition-all placeholder:text-gray-400 font-sans", 
          className
        )} 
        {...props}
      />
    </div>
  );
}
