// Phase 2: Updated location mutations to validate CSRF against the authenticated session.
export const runtime = 'nodejs';

export { GET } from './handlers/get';
export { POST } from './handlers/post';
export { PUT } from './handlers/put';
export { DELETE } from './handlers/delete';
