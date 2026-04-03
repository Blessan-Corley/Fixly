// Barrel — re-exports from modular sub-files in lib/reactQuery/.
export { queryClient } from './reactQuery/client';
export { optimisticUpdates, prefetchHelpers } from './reactQuery/optimistic';
export { backgroundSync, cacheUtils } from './reactQuery/sync';

import { queryClient } from './reactQuery/client';
export default queryClient;
