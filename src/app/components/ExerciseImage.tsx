import React, { useState, useEffect } from 'react';

interface ExerciseImageProps {
  src?: string;
  alt: string;
}

export const ExerciseImage: React.FC<ExerciseImageProps> = ({ src, alt }) => {
  const [hasError, setHasError] = useState(false);
  
  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || src.trim() === '' || hasError) {
    return null;
  }

  return (
    <div className="h-48 bg-gray-200 relative border-b-4 border-black">
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
};
