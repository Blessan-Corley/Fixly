// GET requests are deprecated on this route - use /api/messages/conversations instead.
// POST/PUT/PATCH for send/edit/react remain on this route.
export const dynamic = 'force-dynamic';

export { GET } from './handlers/get';
export { PATCH } from './handlers/patch';
export { POST } from './handlers/post';
export { PUT } from './handlers/put';
