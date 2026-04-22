type CounterEvidenceInput = {
  type: string;
  url: string;
  filename?: string;
  description?: string;
};

type NormalizedCounterEvidence = {
  type: 'image' | 'document' | 'screenshot' | 'chat_log';
  url: string;
  filename?: string;
  description?: string;
  uploadedAt: Date;
};

const EVIDENCE_TYPES = new Set(['image', 'document', 'screenshot', 'chat_log']);

function isEvidenceType(value: string): value is NormalizedCounterEvidence['type'] {
  return EVIDENCE_TYPES.has(value);
}

export function normalizeCounterEvidence(
  counterEvidence: CounterEvidenceInput[]
): NormalizedCounterEvidence[] {
  return counterEvidence.reduce<NormalizedCounterEvidence[]>((acc, item) => {
    if (!item?.type || !item?.url || !isEvidenceType(item.type)) return acc;
    acc.push({
      type: item.type,
      url: item.url,
      filename: item.filename,
      description: item.description,
      uploadedAt: new Date(),
    });
    return acc;
  }, []);
}
