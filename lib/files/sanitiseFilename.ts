// Phase 2: Added UUID-based server-side filenames for uploaded files.
import { randomUUID } from 'node:crypto';

const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'pdf',
  'doc',
  'docx',
]);

export function sanitiseFilename(original: string): string {
  const segments = original.split('.');
  const extension = segments.length > 1 ? segments[segments.length - 1].toLowerCase() : '';
  const safeExtension = ALLOWED_EXTENSIONS.has(extension) ? extension : 'bin';

  return `${randomUUID()}.${safeExtension}`;
}
