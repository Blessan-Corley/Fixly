// lib/fileValidation.js - File content validation and security
import crypto from 'crypto';

// File type signatures (magic bytes)
const FILE_SIGNATURES = {
  // Images
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF], // JPEG
    [0xFF, 0xD8, 0xFF, 0xE0], // JPEG/JFIF
    [0xFF, 0xD8, 0xFF, 0xE1], // JPEG/EXIF
    [0xFF, 0xD8, 0xFF, 0xE2], // JPEG/ICC
    [0xFF, 0xD8, 0xFF, 0xE3], // JPEG
    [0xFF, 0xD8, 0xFF, 0xE8], // JPEG/SPIFF
    [0xFF, 0xD8, 0xFF, 0xDB] // JPEG
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] // PNG
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50] // WEBP (bytes 4-7 are file size)
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]  // GIF89a
  ],

  // Videos
  'video/mp4': [
    [null, null, null, null, 0x66, 0x74, 0x79, 0x70], // MP4 (ftyp box at offset 4)
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32], // MP4
    [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D] // MP4/ISOM
  ],
  'video/quicktime': [
    [null, null, null, null, 0x6D, 0x6F, 0x6F, 0x76], // MOV (moov)
    [null, null, null, null, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74] // MOV
  ],
  'video/avi': [
    [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x41, 0x56, 0x49, 0x20] // AVI
  ],

  // Documents (for future use)
  'application/pdf': [
    [0x25, 0x50, 0x44, 0x46, 0x2D] // PDF
  ]
};

// Dangerous file patterns to detect
const DANGEROUS_PATTERNS = {
  // Executable signatures
  executables: [
    [0x4D, 0x5A], // PE/EXE
    [0x7F, 0x45, 0x4C, 0x46], // ELF
    [0xCA, 0xFE, 0xBA, 0xBE], // Mach-O
    [0xFE, 0xED, 0xFA, 0xCE], // Mach-O
    [0xFE, 0xED, 0xFA, 0xCF], // Mach-O
    [0xCF, 0xFA, 0xED, 0xFE], // Mach-O
    [0x50, 0x4B, 0x03, 0x04], // ZIP (potential executable)
    [0x50, 0x4B, 0x05, 0x06], // ZIP
    [0x50, 0x4B, 0x07, 0x08]  // ZIP
  ],

  // Script patterns in disguised files
  scriptPatterns: [
    'eval(',
    'eval (',
    'Function(',
    'Function (',
    'setTimeout(',
    'setInterval(',
    'document.write',
    'document.cookie',
    'localStorage',
    'sessionStorage',
    'XMLHttpRequest',
    'fetch(',
    'window.location',
    'location.href',
    'location.replace',
    '<script',
    '</script>',
    'javascript:',
    'vbscript:',
    'data:text/html',
    'data:application/javascript'
  ],

  // PHP/Server-side patterns
  serverSidePatterns: [
    '<?php',
    '<?=',
    '<%',
    '%>',
    'exec(',
    'system(',
    'shell_exec(',
    'passthru(',
    'file_get_contents(',
    'file_put_contents(',
    'fopen(',
    'fwrite(',
    'include(',
    'require(',
    'include_once(',
    'require_once('
  ]
};

// Configuration
const FILE_VALIDATION_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxImageSize: 5 * 1024 * 1024,  // 5MB for images
  maxVideoSize: 50 * 1024 * 1024, // 50MB for videos
  minImageSize: 1024, // 1KB minimum
  maxImageDimensions: 4096, // 4K max
  minImageDimensions: 50, // 50px minimum
  scanDepth: 8192, // How many bytes to scan for patterns
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/avi'
  ]
};

export class FileValidator {
  /**
   * Validate file content and security
   */
  static async validateFile(file, options = {}) {
    const config = { ...FILE_VALIDATION_CONFIG, ...options };
    const validationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      metadata: {},
      securityIssues: []
    };

    try {
      // 1. Basic file checks
      if (!file) {
        validationResult.errors.push('No file provided');
        return validationResult;
      }

      // 2. File size validation
      if (file.size > config.maxFileSize) {
        validationResult.errors.push(`File size exceeds maximum limit of ${config.maxFileSize / (1024 * 1024)}MB`);
        return validationResult;
      }

      if (file.size < 100) {
        validationResult.errors.push('File is too small to be a valid media file');
        return validationResult;
      }

      // 3. MIME type validation
      if (!config.allowedMimeTypes.includes(file.type)) {
        validationResult.errors.push(`File type ${file.type} is not allowed`);
        return validationResult;
      }

      // 4. File name validation
      const nameValidation = this.validateFileName(file.name);
      if (!nameValidation.isValid) {
        validationResult.errors.push(...nameValidation.errors);
        return validationResult;
      }

      // 5. Read file content for analysis
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // 6. Magic byte validation
      const signatureValidation = this.validateFileSignature(uint8Array, file.type);
      if (!signatureValidation.isValid) {
        validationResult.errors.push(...signatureValidation.errors);
        validationResult.securityIssues.push('File signature mismatch - possible file type spoofing');
        return validationResult;
      }

      // 7. Content security scan
      const securityScan = this.scanForSecurityThreats(uint8Array);
      if (securityScan.threats.length > 0) {
        validationResult.securityIssues.push(...securityScan.threats);
        validationResult.errors.push('File contains potentially dangerous content');
        return validationResult;
      }

      // 8. File-specific validation
      if (file.type.startsWith('image/')) {
        const imageValidation = await this.validateImageContent(uint8Array, file.type, config);
        if (!imageValidation.isValid) {
          validationResult.errors.push(...imageValidation.errors);
          validationResult.warnings.push(...imageValidation.warnings);
        }
        validationResult.metadata = { ...validationResult.metadata, ...imageValidation.metadata };
      }

      if (file.type.startsWith('video/')) {
        const videoValidation = this.validateVideoContent(uint8Array, file.type, config);
        if (!videoValidation.isValid) {
          validationResult.errors.push(...videoValidation.errors);
          validationResult.warnings.push(...videoValidation.warnings);
        }
        validationResult.metadata = { ...validationResult.metadata, ...videoValidation.metadata };
      }

      // 9. Generate file hash for integrity
      validationResult.metadata.fileHash = await this.generateFileHash(arrayBuffer);

      // 10. Final validation
      validationResult.isValid = validationResult.errors.length === 0;

      return validationResult;

    } catch (error) {
      console.error('File validation error:', error);
      validationResult.errors.push('File validation failed due to processing error');
      return validationResult;
    }
  }

  /**
   * Validate file name for security issues
   */
  static validateFileName(fileName) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check for dangerous characters
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(fileName)) {
      result.isValid = false;
      result.errors.push('File name contains dangerous characters');
    }

    // Check for path traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      result.isValid = false;
      result.errors.push('File name contains path traversal characters');
    }

    // Check for dangerous extensions
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar',
      '.app', '.deb', '.pkg', '.dmg', '.iso', '.bin', '.run', '.sh', '.ps1',
      '.php', '.asp', '.jsp', '.py', '.rb', '.pl', '.cgi'
    ];

    const lowercaseFileName = fileName.toLowerCase();
    for (const ext of dangerousExtensions) {
      if (lowercaseFileName.endsWith(ext)) {
        result.isValid = false;
        result.errors.push(`File extension ${ext} is not allowed`);
        break;
      }
    }

    // Check for double extensions
    const extensionCount = (fileName.match(/\./g) || []).length;
    if (extensionCount > 1) {
      result.warnings.push('File has multiple extensions');
    }

    return result;
  }

  /**
   * Validate file signature against claimed MIME type
   */
  static validateFileSignature(uint8Array, mimeType) {
    const result = {
      isValid: false,
      errors: []
    };

    const signatures = FILE_SIGNATURES[mimeType];
    if (!signatures) {
      result.errors.push(`No signature validation available for ${mimeType}`);
      return result;
    }

    // Check if any signature matches
    for (const signature of signatures) {
      let matches = true;
      for (let i = 0; i < signature.length; i++) {
        if (signature[i] !== null && uint8Array[i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        result.isValid = true;
        return result;
      }
    }

    result.errors.push(`File signature does not match claimed type ${mimeType}`);
    return result;
  }

  /**
   * Scan file content for security threats
   */
  static scanForSecurityThreats(uint8Array) {
    const threats = [];
    const scanLength = Math.min(uint8Array.length, FILE_VALIDATION_CONFIG.scanDepth);

    // Convert to string for pattern scanning
    const content = Array.from(uint8Array.slice(0, scanLength))
      .map(byte => String.fromCharCode(byte))
      .join('');

    // Check for executable signatures
    for (const signature of DANGEROUS_PATTERNS.executables) {
      let matches = true;
      for (let i = 0; i < signature.length && i < uint8Array.length; i++) {
        if (uint8Array[i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        threats.push('File contains executable signature');
        break;
      }
    }

    // Check for script patterns
    for (const pattern of DANGEROUS_PATTERNS.scriptPatterns) {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        threats.push(`File contains suspicious script pattern: ${pattern}`);
      }
    }

    // Check for server-side patterns
    for (const pattern of DANGEROUS_PATTERNS.serverSidePatterns) {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        threats.push(`File contains server-side script pattern: ${pattern}`);
      }
    }

    return { threats };
  }

  /**
   * Validate image-specific content
   */
  static async validateImageContent(uint8Array, mimeType, config) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {}
    };

    try {
      // Size check for images
      if (uint8Array.length > config.maxImageSize) {
        result.errors.push(`Image size exceeds maximum of ${config.maxImageSize / (1024 * 1024)}MB`);
        result.isValid = false;
      }

      if (uint8Array.length < config.minImageSize) {
        result.errors.push('Image is too small to be valid');
        result.isValid = false;
      }

      // Basic image metadata extraction (simplified)
      if (mimeType === 'image/png') {
        const width = (uint8Array[16] << 24) | (uint8Array[17] << 16) | (uint8Array[18] << 8) | uint8Array[19];
        const height = (uint8Array[20] << 24) | (uint8Array[21] << 16) | (uint8Array[22] << 8) | uint8Array[23];

        result.metadata.width = width;
        result.metadata.height = height;

        if (width > config.maxImageDimensions || height > config.maxImageDimensions) {
          result.errors.push(`Image dimensions ${width}x${height} exceed maximum ${config.maxImageDimensions}px`);
          result.isValid = false;
        }

        if (width < config.minImageDimensions || height < config.minImageDimensions) {
          result.errors.push(`Image dimensions ${width}x${height} below minimum ${config.minImageDimensions}px`);
          result.isValid = false;
        }
      }

      // Check for EXIF data in JPEG (potential privacy concern)
      if (mimeType === 'image/jpeg') {
        for (let i = 0; i < uint8Array.length - 4; i++) {
          if (uint8Array[i] === 0xFF && uint8Array[i + 1] === 0xE1) {
            // EXIF marker found
            result.warnings.push('Image contains EXIF metadata (may include location data)');
            result.metadata.hasExif = true;
            break;
          }
        }
      }

    } catch (error) {
      result.warnings.push('Could not fully analyze image metadata');
    }

    return result;
  }

  /**
   * Validate video-specific content
   */
  static validateVideoContent(uint8Array, mimeType, config) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {}
    };

    // Size check for videos
    if (uint8Array.length > config.maxVideoSize) {
      result.errors.push(`Video size exceeds maximum of ${config.maxVideoSize / (1024 * 1024)}MB`);
      result.isValid = false;
    }

    // Basic video validation
    result.metadata.estimatedBitrate = Math.round((uint8Array.length * 8) / 1000); // Rough estimate

    return result;
  }

  /**
   * Generate SHA-256 hash of file content
   */
  static async generateFileHash(arrayBuffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Quick validation for uploads (lighter version)
   */
  static async quickValidate(file) {
    if (!file) return { isValid: false, error: 'No file provided' };

    if (file.size > FILE_VALIDATION_CONFIG.maxFileSize) {
      return { isValid: false, error: 'File too large' };
    }

    if (!FILE_VALIDATION_CONFIG.allowedMimeTypes.includes(file.type)) {
      return { isValid: false, error: 'File type not allowed' };
    }

    const nameValidation = this.validateFileName(file.name);
    if (!nameValidation.isValid) {
      return { isValid: false, error: nameValidation.errors[0] };
    }

    return { isValid: true };
  }
}

export default FileValidator;