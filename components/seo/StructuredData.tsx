// components/seo/StructuredData.tsx - JSON-LD structured data for SEO
import { buildStructuredData, serializeStructuredData } from './StructuredData.builders';
import type { StructuredDataProps } from './StructuredData.types';

export { generateJobPostingSchema, generateReviewSchema } from './StructuredData.builders';
export type { JobSchemaInput, ReviewInput } from './StructuredData.types';

export default function StructuredData({
  type = 'organization',
  data = {},
  idSuffix,
}: StructuredDataProps): React.JSX.Element | null {
  const structuredData = buildStructuredData(type, data);
  if (!structuredData) {
    return null;
  }

  return (
    <script
      id={`structured-data-${idSuffix || type}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeStructuredData(structuredData) }}
    />
  );
}
