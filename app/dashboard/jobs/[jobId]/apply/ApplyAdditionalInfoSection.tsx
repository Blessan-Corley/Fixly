'use client';

import { motion } from 'framer-motion';

import type { ApplicationFormData } from './apply.types';

type ApplyAdditionalInfoSectionProps = {
  formData: Pick<ApplicationFormData, 'requirements' | 'specialNotes'>;
  setFormData: (updater: (prev: ApplicationFormData) => ApplicationFormData) => void;
};

export default function ApplyAdditionalInfoSection({
  formData,
  setFormData,
}: ApplyAdditionalInfoSectionProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="card"
    >
      <h3 className="mb-4 text-lg font-semibold text-fixly-text">Additional Information</h3>
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">
            Requirements (optional)
          </label>
          <textarea
            value={formData.requirements}
            onChange={(e) => setFormData((prev) => ({ ...prev, requirements: e.target.value }))}
            placeholder="Any required tools, preconditions, or dependencies"
            rows={3}
            maxLength={500}
            className="textarea-field"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">
            Special Notes (optional)
          </label>
          <textarea
            value={formData.specialNotes}
            onChange={(e) => setFormData((prev) => ({ ...prev, specialNotes: e.target.value }))}
            placeholder="Any special requirements, tools needed, or additional notes"
            rows={3}
            maxLength={300}
            className="textarea-field"
          />
        </div>
      </div>
    </motion.div>
  );
}
