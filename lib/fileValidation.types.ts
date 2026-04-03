export type ByteSignature = Array<number | null>;

export type FileValidationConfig = {
  maxFileSize: number;
  maxImageSize: number;
  maxVideoSize: number;
  minImageSize: number;
  maxImageDimensions: number;
  minImageDimensions: number;
  scanDepth: number;
  allowedMimeTypes: string[];
};

export type ValidationMetadata = {
  fileHash?: string;
  width?: number;
  height?: number;
  hasExif?: boolean;
  estimatedBitrate?: number;
};

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: ValidationMetadata;
  securityIssues: string[];
};

export type FileNameValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

export type SignatureValidationResult = {
  isValid: boolean;
  errors: string[];
};

export type SecurityScanResult = {
  threats: string[];
};

export type ImageValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: ValidationMetadata;
};

export type VideoValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: ValidationMetadata;
};

export type QuickValidationResult = {
  isValid: boolean;
  error?: string;
};

export type FileLike = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};
