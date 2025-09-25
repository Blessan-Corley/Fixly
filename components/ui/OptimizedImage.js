'use client';

import Image from 'next/image';
import { useState } from 'react';
import { User, Building2, ImageIcon, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Base optimized image component
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = 'blur',
  priority = false,
  quality = 80,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  onLoad,
  onError,
  ...props
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = (e) => {
    setLoading(false);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setLoading(false);
    setError(true);
    onError?.(e);
  };

  // Generate placeholder data URL
  const generatePlaceholder = (w, h) => {
    return `data:image/svg+xml;base64,${btoa(
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="14">Loading...</text>
      </svg>`
    )}`;
  };

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 ${className}`}
        style={{ width, height }}
      >
        <AlertCircle className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div 
          className={`absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse ${className}`}
          style={{ width, height }}
        />
      )}
      <Image
        src={src || generatePlaceholder(width, height)}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        placeholder={placeholder}
        blurDataURL={generatePlaceholder(width, height)}
        priority={priority}
        quality={quality}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
}

// Avatar component with fallbacks
export function Avatar({
  src,
  alt,
  size = 'default',
  fallback,
  className = '',
  showBadge = false,
  badgeColor = 'green',
  ...props
}) {
  const [error, setError] = useState(false);
  
  const sizeMap = {
    xs: { size: 24, className: 'h-6 w-6' },
    sm: { size: 32, className: 'h-8 w-8' },
    default: { size: 40, className: 'h-10 w-10' },
    lg: { size: 56, className: 'h-14 w-14' },
    xl: { size: 80, className: 'h-20 w-20' },
    '2xl': { size: 120, className: 'h-30 w-30' }
  };

  const { size: pixelSize, className: sizeClass } = sizeMap[size];

  const badgeColors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    gray: 'bg-gray-500'
  };

  if (error || !src) {
    return (
      <div className={`relative ${sizeClass} ${className}`}>
        <div className="w-full h-full bg-gradient-to-br from-fixly-accent/20 to-fixly-accent/40 rounded-full flex items-center justify-center">
          {fallback ? (
            <span className="text-fixly-accent font-medium text-lg">
              {fallback}
            </span>
          ) : (
            <User className="h-1/2 w-1/2 text-fixly-accent" />
          )}
        </div>
        {showBadge && (
          <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${badgeColors[badgeColor]} rounded-full border-2 border-white dark:border-gray-800`} />
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClass} ${className}`}>
      <OptimizedImage
        src={src}
        alt={alt}
        width={pixelSize}
        height={pixelSize}
        className="rounded-full object-cover"
        onError={() => setError(true)}
        priority={size === 'xl' || size === '2xl'}
        {...props}
      />
      {showBadge && (
        <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${badgeColors[badgeColor]} rounded-full border-2 border-white dark:border-gray-800`} />
      )}
    </div>
  );
}

// Company logo component
export function CompanyLogo({
  src,
  alt,
  size = 'default',
  className = '',
  fallbackText,
  ...props
}) {
  const [error, setError] = useState(false);
  
  const sizeMap = {
    sm: { size: 32, className: 'h-8 w-8' },
    default: { size: 48, className: 'h-12 w-12' },
    lg: { size: 64, className: 'h-16 w-16' },
    xl: { size: 96, className: 'h-24 w-24' }
  };

  const { size: pixelSize, className: sizeClass } = sizeMap[size];

  if (error || !src) {
    return (
      <div className={`${sizeClass} bg-gradient-to-br from-fixly-secondary/20 to-fixly-primary/20 rounded-lg flex items-center justify-center ${className}`}>
        {fallbackText ? (
          <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">
            {fallbackText.slice(0, 2).toUpperCase()}
          </span>
        ) : (
          <Building2 className="h-1/2 w-1/2 text-blue-600 dark:text-blue-400" />
        )}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={pixelSize}
      height={pixelSize}
      className={`rounded-lg object-cover ${sizeClass} ${className}`}
      onError={() => setError(true)}
      {...props}
    />
  );
}

// Gallery component with lazy loading
export function ImageGallery({ 
  images = [], 
  className = '',
  onImageClick,
  maxHeight = 400
}) {
  const [selectedImage, setSelectedImage] = useState(null);

  if (!images.length) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-8 ${className}`}>
        <div className="text-center">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">No images available</p>
        </div>
      </div>
    );
  }

  const handleImageClick = (image, index) => {
    setSelectedImage({ ...image, index });
    onImageClick?.(image, index);
  };

  return (
    <>
      <div className={`grid gap-2 ${className}`} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {images.map((image, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            onClick={() => handleImageClick(image, index)}
          >
            <OptimizedImage
              src={image.src || image.url || image}
              alt={image.alt || `Image ${index + 1}`}
              width={400}
              height={maxHeight}
              className="w-full object-cover"
              style={{ maxHeight }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </motion.div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            className="relative max-w-4xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <OptimizedImage
              src={selectedImage.src || selectedImage.url || selectedImage}
              alt={selectedImage.alt || `Image ${selectedImage.index + 1}`}
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain rounded-lg"
              priority
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

// Progressive image loader for hero sections
export function HeroImage({
  src,
  alt,
  className = '',
  overlay = false,
  overlayColor = 'black',
  overlayOpacity = 0.4,
  children,
  ...props
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className="object-cover"
        priority
        quality={90}
        sizes="100vw"
        {...props}
      />
      {overlay && (
        <div 
          className="absolute inset-0"
          style={{ 
            background: `${overlayColor}`,
            opacity: overlayOpacity
          }}
        />
      )}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

export default OptimizedImage;