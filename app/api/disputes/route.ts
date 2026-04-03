// Phase 2: Updated dispute mutations to validate CSRF against the authenticated session.
export const dynamic = 'force-dynamic';

export { handleGetDisputes as GET } from './handlers/get-disputes';
export { handlePostDispute as POST } from './handlers/post-dispute';
export { handlePutDispute as PUT } from './handlers/put-dispute';
