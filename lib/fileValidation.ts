import { logger } from '@/lib/logger';

import { FILE_VALIDATION_CONFIG } from './fileValidation.constants';
import { validateImageContent, validateVideoContent, generateFileHash } from './fileValidation.content';
import type { FileLike, FileValidationConfig, QuickValidationResult, ValidationResult } from './fileValidation.types';
import {
  createEmptyValidationResult,
  scanForSecurityThreats,
  validateFileName,
  validateFileSignature,
} from './fileValidation.validators';

export class FileValidator {
  static async validateFile(
    file: FileLike | null | undefined,
    options: Partial<FileValidationConfig> = {}
  ): Promise<ValidationResult> {
    const config: FileValidationConfig = { ...FILE_VALIDATION_CONFIG, ...options };
    const validationResult = createEmptyValidationResult();

    try {
      if (!file) {
        validationResult.errors.push('No file provided');
        return validationResult;
      }

      if (file.size > config.maxFileSize) {
        validationResult.errors.push(
          `File size exceeds maximum limit of ${config.maxFileSize / (1024 * 1024)}MB`
        );
        return validationResult;
      }

      if (file.size < 100) {
        validationResult.errors.push('File is too small to be a valid media file');
        return validationResult;
      }

      if (!config.allowedMimeTypes.includes(file.type)) {
        validationResult.errors.push(`File type ${file.type} is not allowed`);
        return validationResult;
      }

      const nameValidation = validateFileName(file.name);
      if (!nameValidation.isValid) {
        validationResult.errors.push(...nameValidation.errors);
        return validationResult;
      }

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const signatureValidation = validateFileSignature(uint8Array, file.type);
      if (!signatureValidation.isValid) {
        validationResult.errors.push(...signatureValidation.errors);
        validationResult.securityIssues.push(
          'File signature mismatch - possible file type spoofing'
        );
        return validationResult;
      }

      const securityScan = scanForSecurityThreats(uint8Array);
      if (securityScan.threats.length > 0) {
        validationResult.securityIssues.push(...securityScan.threats);
        validationResult.errors.push('File contains potentially dangerous content');
        return validationResult;
      }

      if (file.type.startsWith('image/')) {
        const imageValidation = await validateImageContent(uint8Array, file.type, config);
        if (!imageValidation.isValid) {
          validationResult.errors.push(...imageValidation.errors);
          validationResult.warnings.push(...imageValidation.warnings);
        }
        validationResult.metadata = { ...validationResult.metadata, ...imageValidation.metadata };
      }

      if (file.type.startsWith('video/')) {
        const videoValidation = validateVideoContent(uint8Array, file.type, config);
        if (!videoValidation.isValid) {
          validationResult.errors.push(...videoValidation.errors);
          validationResult.warnings.push(...videoValidation.warnings);
        }
        validationResult.metadata = { ...validationResult.metadata, ...videoValidation.metadata };
      }

      validationResult.metadata.fileHash = await generateFileHash(arrayBuffer);
      validationResult.isValid = validationResult.errors.length === 0;

      return validationResult;
    } catch (error) {
      logger.error({ error }, 'File validation error');
      validationResult.errors.push('File validation failed due to processing error');
      return validationResult;
    }
  }

  static validateFileName(fileName: string): ReturnType<typeof validateFileName> {
    return validateFileName(fileName);
  }

  static async quickValidate(file: FileLike | null | undefined): Promise<QuickValidationResult> {
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    if (file.size > FILE_VALIDATION_CONFIG.maxFileSize) {
      return { isValid: false, error: 'File too large' };
    }

    if (!FILE_VALIDATION_CONFIG.allowedMimeTypes.includes(file.type)) {
      return { isValid: false, error: 'File type not allowed' };
    }

    const nameValidation = validateFileName(file.name);
    if (!nameValidation.isValid) {
      return { isValid: false, error: nameValidation.errors[0] };
    }

    return { isValid: true };
  }
}

export default FileValidator;
