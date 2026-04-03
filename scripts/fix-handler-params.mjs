/**
 * Fix Next.js 15 async params in handler files that the codemod missed.
 * These are handler files in ./handlers/ subdirectories that use
 * { params }: JobRouteContext — needs to be segmentData: JobRouteContext
 * with const params = await segmentData.params; at the start of the body.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE = resolve(process.cwd(), 'app/api/jobs/[jobId]');

// Each entry: [filePath, transformFn]
const FILES = [
  'apply/handlers/get.ts',
  'apply/handlers/post.ts',
  'applications/handlers/get.ts',
  'applications/handlers/put.ts',
  'comments/handlers/delete.ts',
  'comments/handlers/post.ts',
  'comments/handlers/put.ts',
  'handlers/delete.ts',
  'handlers/get.ts',
  'handlers/put.ts',
  'review/handlers/get.ts',
  'review/handlers/post.ts',
  'view/handlers/get.ts',
  'view/handlers/post.ts',
];

// Multi-line function signature files need a different treatment
const MULTILINE_FILES = [
  'status/handlers/get.ts',  // handleGet(_request: Request, \n  { params }: JobRouteContext\n)
  'status/handlers/put.ts',  // handlePut(request: Request, { params }: JobRouteContext)
];

// Pattern: function signature with { params } destructuring, then opening brace
// We replace { params }: JobRouteContext -> segmentData: JobRouteContext
// and insert const params = await segmentData.params; after the opening {

function transformFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  const original = content;

  // Replace single-line: (request: Request, { params }: JobRouteContext)
  // Handles: request, _request
  content = content.replace(
    /(\(_?request: Request,\s*)\{ params \}(\s*:\s*JobRouteContext)(\s*\))/g,
    '$1segmentData$2$3'
  );

  // Replace single-line with return type: ... JobRouteContext): Promise<Response> {
  // The closing { at end of line
  // After replacement, insert const params = await segmentData.params;

  // Now insert "const params = await segmentData.params;" as first statement in function body
  // Find: ): Promise<Response> {\n or ) {\n  try { or ) {\n  const
  // Strategy: after replacing { params } -> segmentData, the function body opens with {
  // We need to insert the await line after the opening {
  // This regex finds the function body opening { and inserts the await line

  // For async functions that use segmentData but haven't been given the await yet
  content = content.replace(
    /(async function \w+[^{]*segmentData: JobRouteContext[^{]*\{)(\s*\n)/g,
    (match, signature, newline) => {
      return signature + newline + '  const params = await segmentData.params;\n';
    }
  );

  // Also handle arrow function pattern inside withCache
  content = content.replace(
    /(async \(_?request: Request,\s*segmentData: JobRouteContext\):\s*Promise<Response>\s*=>\s*\{)(\s*\n)/g,
    (match, signature, newline) => {
      return signature + newline + '    const params = await segmentData.params;\n';
    }
  );

  if (content !== original) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated: ${filePath}`);
  } else {
    console.log(`~ No changes: ${filePath}`);
  }
  return content !== original;
}

function transformMultilineFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  const original = content;

  // Replace multi-line pattern:
  //   _request: Request,\n  { params }: JobRouteContext\n
  // ->
  //   _request: Request,\n  segmentData: JobRouteContext\n
  content = content.replace(
    /(\s*_?request: Request,\s*\n\s*)\{ params \}(\s*:\s*JobRouteContext)/g,
    '$1segmentData$2'
  );

  // Insert await after opening brace
  content = content.replace(
    /(async function \w+[^{]*segmentData: JobRouteContext[^{]*\{)(\s*\n)/g,
    (match, signature, newline) => {
      return signature + newline + '  const params = await segmentData.params;\n';
    }
  );

  if (content !== original) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated (multiline): ${filePath}`);
  } else {
    console.log(`~ No changes (multiline): ${filePath}`);
  }
  return content !== original;
}

let updatedCount = 0;

for (const rel of FILES) {
  const full = resolve(BASE, rel);
  try {
    if (transformFile(full)) updatedCount++;
  } catch (e) {
    console.error(`✗ Error processing ${rel}: ${e.message}`);
  }
}

for (const rel of MULTILINE_FILES) {
  const full = resolve(BASE, rel);
  try {
    if (transformMultilineFile(full)) updatedCount++;
  } catch (e) {
    console.error(`✗ Error processing ${rel}: ${e.message}`);
  }
}

// Special: comments/handlers/shared.ts has an arrow function inside withCache
const sharedFile = resolve(BASE, 'comments/handlers/shared.ts');
try {
  let content = readFileSync(sharedFile, 'utf8');
  const original = content;

  // Replace { params }: JobRouteContext inside the arrow function callback
  content = content.replace(
    /async \(_request: Request,\s*\{ params \}: JobRouteContext\):\s*Promise<Response>\s*=>/g,
    'async (_request: Request, segmentData: JobRouteContext): Promise<Response> =>'
  );

  // Insert const params after the arrow function opening brace
  content = content.replace(
    /(async \(_request: Request, segmentData: JobRouteContext\):\s*Promise<Response>\s*=>\s*\{)(\s*\n)/g,
    (match, sig, nl) => sig + nl + '    const params = await segmentData.params;\n'
  );

  if (content !== original) {
    writeFileSync(sharedFile, content, 'utf8');
    console.log(`✓ Updated (shared): comments/handlers/shared.ts`);
    updatedCount++;
  } else {
    console.log(`~ No changes: comments/handlers/shared.ts`);
  }
} catch (e) {
  console.error(`✗ Error processing comments/handlers/shared.ts: ${e.message}`);
}

console.log(`\nDone. Updated ${updatedCount} files.`);
