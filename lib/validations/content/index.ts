export * from '@/lib/validations/content/content.types';
export { ContentValidator } from '@/lib/validations/content/engine';

import { ContentValidator } from '@/lib/validations/content/engine';

export const validateContent = ContentValidator.validateContent.bind(ContentValidator);
export const validateUsername = ContentValidator.validateUsername.bind(ContentValidator);
export const validateBio = ContentValidator.validateBio.bind(ContentValidator);
export const validateSkills = ContentValidator.validateSkills.bind(ContentValidator);

export default ContentValidator;
