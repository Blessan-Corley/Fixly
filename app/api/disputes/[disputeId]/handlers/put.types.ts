import { z } from 'zod';

export type SubmitResponseBody = {
  content?: string;
  acknowledgement?: 'acknowledge' | 'dispute' | 'counter_claim';
  counterEvidence?: Array<{
    type: string;
    url: string;
    filename?: string;
    description?: string;
  }>;
  counterClaim?: {
    category?: string;
    description?: string;
    desiredOutcome?: string;
    amount?: number;
  };
};

export const SubmitResponseBodySchema: z.ZodType<SubmitResponseBody> = z.object({
  content: z.string().optional(),
  acknowledgement: z.enum(['acknowledge', 'dispute', 'counter_claim']).optional(),
  counterEvidence: z
    .array(
      z.object({
        type: z.string(),
        url: z.string(),
        filename: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .optional(),
  counterClaim: z
    .object({
      category: z.string().optional(),
      description: z.string().optional(),
      desiredOutcome: z.string().optional(),
      amount: z.number().optional(),
    })
    .optional(),
});
