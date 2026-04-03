import { DANGEROUS_PATTERNS, FILE_SIGNATURES, FILE_VALIDATION_CONFIG } from './fileValidation.constants';
import type {
  ByteSignature,
  FileNameValidationResult,
  SecurityScanResult,
  SignatureValidationResult,
  ValidationResult,
} from './fileValidation.types';

export function createEmptyValidationResult(): ValidationResult {
  return {
    isValid: false,
    errors: [],
    warnings: [],
    metadata: {},
    securityIssues: [],
  };
}

function signatureMatches(signature: ByteSignature, bytes: Uint8Array): boolean {
  for (let index = 0; index < signature.length; index += 1) {
    const expected = signature[index];
    if (expected !== null && bytes[index] !== expected) {
      return false;
    }
  }
  return true;
}

export function toSafeStringContent(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join('');
}

export function validateFileName(fileName: string): FileNameValidationResult {
  const result: FileNameValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const dangerousChars = /[<>:"|?*\x00-\x1f]/;
  if (dangerousChars.test(fileName)) {
    result.isValid = false;
    result.errors.push('File name contains dangerous characters');
  }

  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    result.isValid = false;
    result.errors.push('File name contains path traversal characters');
  }

  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js',
    '.jar', '.app', '.deb', '.pkg', '.dmg', '.iso', '.bin', '.run',
    '.sh', '.ps1', '.php', '.asp', '.jsp', '.py', '.rb', '.pl', '.cgi',
  ];

  const lowercaseFileName = fileName.toLowerCase();
  for (const extension of dangerousExtensions) {
    if (lowercaseFileName.endsWith(extension)) {
      result.isValid = false;
      result.errors.push(`File extension ${extension} is not allowed`);
      break;
    }
  }

  const extensionCount = (fileName.match(/\./g) ?? []).length;
  if (extensionCount > 1) {
    result.warnings.push('File has multiple extensions');
  }

  return result;
}

export function validateFileSignature(
  uint8Array: Uint8Array,
  mimeType: string
): SignatureValidationResult {
  const result: SignatureValidationResult = {
    isValid: false,
    errors: [],
  };

  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) {
    result.errors.push(`No signature validation available for ${mimeType}`);
    return result;
  }

  for (const signature of signatures) {
    if (signatureMatches(signature, uint8Array)) {
      result.isValid = true;
      return result;
    }
  }

  result.errors.push(`File signature does not match claimed type ${mimeType}`);
  return result;
}

export function scanForSecurityThreats(uint8Array: Uint8Array): SecurityScanResult {
  const threats: string[] = [];
  const scanLength = Math.min(uint8Array.length, FILE_VALIDATION_CONFIG.scanDepth);
  const scanBytes = uint8Array.slice(0, scanLength);
  const content = toSafeStringContent(scanBytes).toLowerCase();

  for (const signature of DANGEROUS_PATTERNS.executables) {
    let matches = true;
    for (let index = 0; index < signature.length && index < uint8Array.length; index += 1) {
      if (uint8Array[index] !== signature[index]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      threats.push('File contains executable signature');
      break;
    }
  }

  for (const pattern of DANGEROUS_PATTERNS.scriptPatterns) {
    if (content.includes(pattern.toLowerCase())) {
      threats.push(`File contains suspicious script pattern: ${pattern}`);
    }
  }

  for (const pattern of DANGEROUS_PATTERNS.serverSidePatterns) {
    if (content.includes(pattern.toLowerCase())) {
      threats.push(`File contains server-side script pattern: ${pattern}`);
    }
  }

  return { threats };
}
