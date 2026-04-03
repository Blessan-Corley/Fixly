'use client';

import { motion } from 'framer-motion';
import {
  DollarSign,
  FileText,
  Loader,
  Package,
  Send,
} from 'lucide-react';
import type React from 'react';

import type { ApplicationFormData, JobDetails, MaterialItem, TimeEstimateUnit } from './apply.types';
import { formatBudget } from './apply.utils';
import ApplyAdditionalInfoSection from './ApplyAdditionalInfoSection';
import ApplyJobSummaryCard from './ApplyJobSummaryCard';
import ApplyMaterialsSection from './ApplyMaterialsSection';

type ApplyApplicationFormProps = {
  job: JobDetails;
  formData: ApplicationFormData;
  isSubmitting: boolean;
  totalMaterialCost: number;
  setFormData: (updater: (prev: ApplicationFormData) => ApplicationFormData) => void;
  addMaterialItem: () => void;
  removeMaterialItem: (index: number) => void;
  updateMaterialItem: <K extends keyof MaterialItem>(
    index: number,
    field: K,
    value: MaterialItem[K]
  ) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

export default function ApplyApplicationForm({
  job,
  formData,
  isSubmitting,
  totalMaterialCost,
  setFormData,
  addMaterialItem,
  removeMaterialItem,
  updateMaterialItem,
  onSubmit,
}: ApplyApplicationFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <ApplyJobSummaryCard job={job} />

      {/* Proposed Amount + Time Estimate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <h3 className="mb-4 flex items-center text-lg font-semibold text-fixly-text">
          <DollarSign className="mr-2 h-5 w-5 text-green-600" />
          Your Proposed Amount *
        </h3>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">Amount (Rs.)</label>
            <input
              type="number"
              required
              value={formData.proposedAmount}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, proposedAmount: e.target.value }))
              }
              placeholder="Enter your proposed amount"
              className="input-field"
              min="1"
            />
            {job.budget.type !== 'negotiable' && (
              <p className="mt-1 text-sm text-fixly-text-light">
                Job budget: {formatBudget(job.budget)}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">
              Estimated Completion Time
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={formData.timeEstimate.value}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    timeEstimate: { ...prev.timeEstimate, value: e.target.value },
                  }))
                }
                placeholder="Duration"
                className="input-field flex-1"
                min="1"
              />
              <select
                value={formData.timeEstimate.unit}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    timeEstimate: {
                      ...prev.timeEstimate,
                      unit: e.target.value as TimeEstimateUnit,
                    },
                  }))
                }
                className="select-field"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Cover Letter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <h3 className="mb-4 flex items-center text-lg font-semibold text-fixly-text">
          <FileText className="mr-2 h-5 w-5 text-blue-600" />
          Why are you the right fit? *
        </h3>
        <div>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Briefly explain why you're fit for this job and how you will complete it..."
            rows={5}
            maxLength={600}
            className="textarea-field"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-fixly-text-light">
              Minimum 20 characters, maximum 600 characters
            </p>
            <span className="text-sm text-fixly-text-light">{formData.description.length}/600</span>
          </div>
        </div>
      </motion.div>

      {/* Materials */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h3 className="mb-4 flex items-center text-lg font-semibold text-fixly-text">
          <Package className="mr-2 h-5 w-5 text-orange-600" />
          Materials &amp; Supplies
        </h3>
        <ApplyMaterialsSection
          materialsIncluded={formData.materialsIncluded}
          materialsList={formData.materialsList}
          totalMaterialCost={totalMaterialCost}
          onToggle={(checked) =>
            setFormData((prev) => ({ ...prev, materialsIncluded: checked }))
          }
          onAdd={addMaterialItem}
          onRemove={removeMaterialItem}
          onUpdate={updateMaterialItem}
        />
      </motion.div>

      <ApplyAdditionalInfoSection formData={formData} setFormData={setFormData} />

      {/* Submit */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-fixly-text">Ready to Submit?</h4>
            <p className="text-sm text-fixly-text-light">
              Make sure all information is accurate before submitting
            </p>
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center">
            {isSubmitting ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Submit Proposal
          </button>
        </div>
      </motion.div>
    </form>
  );
}
