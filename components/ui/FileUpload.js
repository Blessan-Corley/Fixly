'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Video,
  File,
  Loader,
  CheckCircle,
  AlertCircle,
  Camera
} from 'lucide-react';

/**
 * Enhanced FileUpload component with Cloudinary integration
 * Supports images, videos, and various upload types with rate limiting
 */
export default function FileUpload({
  uploadType = 'general', // 'profile', 'message', 'job'
  accept = 'image/*,video/*',
  maxSize = null, // Will auto-detect based on file type
  maxFiles = 5,
  onUploadComplete,
  onUploadError,
  onUploadStart,
  allowMultiple = true,
  className = '',
  disabled = false,
  showPreview = true,
  placeholder = null
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [disabled]);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  }, []);

  const handleFiles = useCallback(async (files) => {
    if (!files.length) return;
    
    // Filter files based on accept prop and maxFiles
    const validFiles = files.slice(0, maxFiles).filter(file => {
      if (accept === 'image/*') {
        return file.type.startsWith('image/');
      } else if (accept === 'video/*') {
        return file.type.startsWith('video/');
      } else if (accept === 'image/*,video/*') {
        return file.type.startsWith('image/') || file.type.startsWith('video/');
      }
      return true;
    });

    if (validFiles.length === 0) {
      onUploadError?.('No valid files selected. Please select supported file types.');
      return;
    }

    setIsUploading(true);
    onUploadStart?.();

    const uploadPromises = validFiles.map(async (file) => {
      const uploadId = Date.now() + Math.random();
      
      // Create optimistic upload entry
      const uploadEntry = {
        id: uploadId,
        file,
        status: 'uploading',
        progress: 0,
        preview: URL.createObjectURL(file),
        isVideo: file.type.startsWith('video/')
      };

      setUploads(prev => [...prev, uploadEntry]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', uploadType);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Update upload entry with success
          setUploads(prev => prev.map(upload => 
            upload.id === uploadId 
              ? { 
                  ...upload, 
                  status: 'completed',
                  progress: 100,
                  result: result,
                  url: result.url
                }
              : upload
          ));

          return result;
        } else {
          throw new Error(result.message || 'Upload failed');
        }
      } catch (error) {
        // Update upload entry with error
        setUploads(prev => prev.map(upload => 
          upload.id === uploadId 
            ? { 
                ...upload, 
                status: 'error',
                error: error.message
              }
            : upload
        ));
        throw error;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      onUploadComplete?.(results.filter(Boolean));
    } catch (error) {
      onUploadError?.(error.message);
    } finally {
      setIsUploading(false);
    }
  }, [accept, maxFiles, uploadType, onUploadComplete, onUploadError, onUploadStart]);

  const removeUpload = useCallback((uploadId) => {
    setUploads(prev => {
      const updated = prev.filter(upload => upload.id !== uploadId);
      // Revoke object URL to prevent memory leaks
      const removedUpload = prev.find(upload => upload.id === uploadId);
      if (removedUpload?.preview) {
        URL.revokeObjectURL(removedUpload.preview);
      }
      return updated;
    });
  }, []);

  const getIcon = (file) => {
    if (file.type.startsWith('image/')) return ImageIcon;
    if (file.type.startsWith('video/')) return Video;
    return File;
  };

  const getPlaceholderText = () => {
    if (placeholder) return placeholder;
    
    switch (uploadType) {
      case 'profile':
        return 'Upload profile picture';
      case 'message':
        return 'Share photos or videos';
      case 'job':
        return 'Add photos/videos of the work needed';
      default:
        return 'Drag and drop files here, or click to select';
    }
  };

  return (
    <div className={`file-upload-container ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isUploading ? 'pointer-events-none' : ''}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={allowMultiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        <div className="space-y-3">
          {uploadType === 'profile' ? (
            <Camera className="h-8 w-8 text-gray-400 mx-auto" />
          ) : (
            <Upload className="h-8 w-8 text-gray-400 mx-auto" />
          )}
          
          <div>
            <p className="text-sm font-medium text-gray-700">
              {getPlaceholderText()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {accept === 'image/*' && 'Images up to 5MB'}
              {accept === 'video/*' && 'Videos up to 50MB'}
              {accept === 'image/*,video/*' && 'Images (5MB) or Videos (50MB)'}
            </p>
          </div>

          {isUploading && (
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <Loader className="h-4 w-4 animate-spin" />
              <span className="text-sm">Uploading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress & Previews */}
      {showPreview && uploads.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            {isUploading ? 'Uploading Files' : 'Uploaded Files'}
          </h4>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <AnimatePresence>
              {uploads.map((upload) => {
                const Icon = getIcon(upload.file);
                
                return (
                  <motion.div
                    key={upload.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {/* Preview */}
                    <div className="flex-shrink-0">
                      {upload.preview && !upload.isVideo ? (
                        <img
                          src={upload.preview}
                          alt={upload.file.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <Icon className="h-6 w-6 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {upload.file.name}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{(upload.file.size / 1024 / 1024).toFixed(1)} MB</span>
                        {upload.status === 'uploading' && (
                          <span>• Uploading...</span>
                        )}
                        {upload.status === 'completed' && (
                          <span className="text-green-600">• Uploaded</span>
                        )}
                        {upload.status === 'error' && (
                          <span className="text-red-600">• Failed</span>
                        )}
                      </div>
                      {upload.error && (
                        <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                      )}
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {upload.status === 'uploading' && (
                        <Loader className="h-4 w-4 text-blue-500 animate-spin" />
                      )}
                      {upload.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {upload.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUpload(upload.id);
                      }}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      disabled={upload.status === 'uploading'}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

// Profile Picture Upload Component
export function ProfilePictureUpload({ currentImage, onUploadComplete, className = '' }) {
  return (
    <div className={`profile-picture-upload ${className}`}>
      <div className="flex items-center space-x-4">
        {/* Current Image */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300">
            {currentImage ? (
              <img
                src={currentImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Upload Component */}
        <div className="flex-1">
          <FileUpload
            uploadType="profile"
            accept="image/*"
            allowMultiple={false}
            maxFiles={1}
            placeholder="Click to upload profile picture"
            onUploadComplete={(results) => {
              if (results.length > 0) {
                onUploadComplete(results[0].url);
              }
            }}
            showPreview={false}
            className="!p-4"
          />
        </div>
      </div>
    </div>
  );
}

// Message Media Upload Component  
export function MessageMediaUpload({ onUploadComplete, className = '' }) {
  return (
    <FileUpload
      uploadType="message"
      accept="image/*,video/*"
      allowMultiple={true}
      maxFiles={5}
      placeholder="Add photos or videos to your message"
      onUploadComplete={onUploadComplete}
      className={className}
    />
  );
}

// Job Media Upload Component
export function JobMediaUpload({ onUploadComplete, className = '' }) {
  return (
    <FileUpload
      uploadType="job"
      accept="image/*,video/*"
      allowMultiple={true}
      maxFiles={10}
      placeholder="Upload photos or videos showing the work needed"
      onUploadComplete={onUploadComplete}
      className={className}
    />
  );
}