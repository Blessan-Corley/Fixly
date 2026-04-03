import { createHash } from 'crypto';

import type { FileValidationConfig, ImageValidationResult, VideoValidationResult } from './fileValidation.types';

export async function validateImageContent(
  uint8Array: Uint8Array,
  mimeType: string,
  config: FileValidationConfig
): Promise<ImageValidationResult> {
  const result: ImageValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    metadata: {},
  };

  try {
    if (uint8Array.length > config.maxImageSize) {
      result.errors.push(
        `Image size exceeds maximum of ${config.maxImageSize / (1024 * 1024)}MB`
      );
      result.isValid = false;
    }

    if (uint8Array.length < config.minImageSize) {
      result.errors.push('Image is too small to be valid');
      result.isValid = false;
    }

    if (mimeType === 'image/png' && uint8Array.length >= 24) {
      const width =
        (uint8Array[16] << 24) | (uint8Array[17] << 16) | (uint8Array[18] << 8) | uint8Array[19];
      const height =
        (uint8Array[20] << 24) | (uint8Array[21] << 16) | (uint8Array[22] << 8) | uint8Array[23];

      result.metadata.width = width;
      result.metadata.height = height;

      if (width > config.maxImageDimensions || height > config.maxImageDimensions) {
        result.errors.push(
          `Image dimensions ${width}x${height} exceed maximum ${config.maxImageDimensions}px`
        );
        result.isValid = false;
      }

      if (width < config.minImageDimensions || height < config.minImageDimensions) {
        result.errors.push(
          `Image dimensions ${width}x${height} below minimum ${config.minImageDimensions}px`
        );
        result.isValid = false;
      }
    }

    if (mimeType === 'image/jpeg') {
      for (let index = 0; index < uint8Array.length - 4; index += 1) {
        if (uint8Array[index] === 0xff && uint8Array[index + 1] === 0xe1) {
          result.warnings.push('Image contains EXIF metadata (may include location data)');
          result.metadata.hasExif = true;
          break;
        }
      }
    }
  } catch {
    result.warnings.push('Could not fully analyze image metadata');
  }

  return result;
}

export function validateVideoContent(
  uint8Array: Uint8Array,
  _mimeType: string,
  config: FileValidationConfig
): VideoValidationResult {
  const result: VideoValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    metadata: {},
  };

  if (uint8Array.length > config.maxVideoSize) {
    result.errors.push(`Video size exceeds maximum of ${config.maxVideoSize / (1024 * 1024)}MB`);
    result.isValid = false;
  }

  result.metadata.estimatedBitrate = Math.round((uint8Array.length * 8) / 1000);
  return result;
}

export async function generateFileHash(arrayBuffer: ArrayBuffer): Promise<string> {
  return createHash('sha256').update(Buffer.from(arrayBuffer)).digest('hex');
}
