import mongoose from 'mongoose';

import { addDisputeHooks } from './dispute/hooks';
import { addDisputeIndexes } from './dispute/indexes';
import { addDisputeMethods } from './dispute/methods';
import { DisputeSchema } from './dispute/schema';
import { addDisputeStatics } from './dispute/statics';
import type { Dispute, DisputeModel } from './dispute/types';
import { addDisputeVirtuals } from './dispute/virtuals';

addDisputeIndexes(DisputeSchema);
addDisputeVirtuals(DisputeSchema);
addDisputeMethods(DisputeSchema);
addDisputeStatics(DisputeSchema);
addDisputeHooks(DisputeSchema);

export type { Dispute, DisputeDocument, DisputeMethods, DisputeModel, DisputeStatistics } from './dispute/types';

export default (mongoose.models.Dispute as DisputeModel) ||
  mongoose.model<Dispute, DisputeModel>('Dispute', DisputeSchema);
