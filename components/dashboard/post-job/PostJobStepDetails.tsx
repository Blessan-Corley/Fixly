'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

import type {
  FieldValidations,
  FormErrors,
  PostJobFormData,
  ValidationMessages,
} from '../../../types/jobs/post-job';

const SkillSelector = dynamic(() => import('../../SkillSelector/SkillSelector'), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-fixly-border p-4 text-sm text-fixly-text-muted">
      Loading skills...
    </div>
  ),
});

interface PostJobStepDetailsProps {
  errors: FormErrors;
  fieldValidations: FieldValidations;
  formData: PostJobFormData;
  validationMessages: ValidationMessages;
  onDescriptionChange: (value: string) => void;
  onSkillsChange: (skills: PostJobFormData['skillsRequired']) => void;
  onTitleChange: (value: string) => void;
}

export default function PostJobStepDetails({
  errors,
  fieldValidations,
  formData,
  validationMessages,
  onDescriptionChange,
  onSkillsChange,
  onTitleChange,
}: PostJobStepDetailsProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="mb-4 text-xl font-semibold text-fixly-text">Job Details</h2>
        <p className="mb-6 text-fixly-text-light">Provide clear details about what you need done</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-fixly-text">Job Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g., Fix kitchen sink leak"
          className={`input-field ${
            fieldValidations.title === false
              ? 'border-red-500 focus:border-red-500'
              : fieldValidations.title === true
                ? 'border-green-500 focus:border-green-500'
                : errors.title
                  ? 'border-red-500 focus:border-red-500'
                  : ''
          }`}
          maxLength={30}
        />
        <div className="mt-1 flex justify-between">
          <div className="flex-1">
            {validationMessages.title && (
              <p
                className={`text-sm ${fieldValidations.title ? 'text-green-600' : 'text-red-500'}`}
              >
                {validationMessages.title}
              </p>
            )}
            {errors.title && !validationMessages.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>
          <p className="ml-auto text-xs text-fixly-text-muted">{formData.title.length}/30</p>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-fixly-text">Description *</label>
        <textarea
          value={formData.description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe the work in detail. Include what needs to be done, any specific requirements, and what materials are needed..."
          className={`textarea-field h-32 ${
            fieldValidations.description === false
              ? 'border-red-500 focus:border-red-500'
              : fieldValidations.description === true
                ? 'border-green-500 focus:border-green-500'
                : errors.description
                  ? 'border-red-500 focus:border-red-500'
                  : ''
          }`}
          maxLength={2000}
        />
        <div className="mt-1 flex justify-between">
          <div className="flex-1">
            {validationMessages.description && (
              <p
                className={`text-sm ${fieldValidations.description ? 'text-green-600' : 'text-red-500'}`}
              >
                {validationMessages.description}
              </p>
            )}
            {errors.description && !validationMessages.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>
          <p className="ml-auto text-xs text-fixly-text-muted">
            {formData.description.length}/2000
          </p>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-fixly-text">
          Skills Required <span className="text-red-500">*</span>
        </label>
        <p className="mb-4 text-xs text-fixly-text-light">
          Select the skills needed for this job. This helps fixers understand the requirements.
        </p>

        <SkillSelector
          isModal={false}
          selectedSkills={formData.skillsRequired}
          onSkillsChange={onSkillsChange}
          minSkills={1}
          maxSkills={15}
          className="w-full"
        />

        {errors.skillsRequired && (
          <p className="mt-1 text-sm text-red-500">{errors.skillsRequired}</p>
        )}
      </div>
    </motion.div>
  );
}
