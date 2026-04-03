'use client';

import { X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import type { JobApplicationFormData } from '../../../app/dashboard/jobs/[jobId]/page.helpers';

type MaterialsListSectionProps = {
  materialsList: JobApplicationFormData['materialsList'];
  setApplicationData: Dispatch<SetStateAction<JobApplicationFormData>>;
};

export default function MaterialsListSection({
  materialsList,
  setApplicationData,
}: MaterialsListSectionProps) {
  const updateMaterial = (
    index: number,
    field: 'item' | 'quantity' | 'estimatedCost',
    value: string
  ) => {
    const newMaterials = [...materialsList];
    if (field === 'item') {
      newMaterials[index].item = value;
    } else if (field === 'quantity') {
      newMaterials[index].quantity = parseInt(value || '0', 10) || 1;
    } else {
      newMaterials[index].estimatedCost = parseFloat(value || '0') || 0;
    }
    setApplicationData((prev) => ({ ...prev, materialsList: newMaterials }));
  };

  const removeMaterial = (index: number) => {
    setApplicationData((prev) => ({
      ...prev,
      materialsList: prev.materialsList.filter((_, i) => i !== index),
    }));
  };

  const addMaterial = () => {
    setApplicationData((prev) => ({
      ...prev,
      materialsList: [...prev.materialsList, { item: '', quantity: 1, estimatedCost: 0 }],
    }));
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-fixly-text">
        Materials Needed (Optional)
      </label>
      {materialsList.map((material, index) => (
        <div key={index} className="mb-2 flex space-x-2">
          <input
            type="text"
            value={material.item ?? ''}
            onChange={(e) => updateMaterial(index, 'item', e.target.value)}
            className="input flex-1"
            placeholder="Material/Tool name"
          />
          <input
            type="number"
            value={material.quantity ?? ''}
            onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
            className="input w-20"
            placeholder="Qty"
            min="1"
          />
          <input
            type="number"
            value={material.estimatedCost ?? ''}
            onChange={(e) => updateMaterial(index, 'estimatedCost', e.target.value)}
            className="input w-24"
            placeholder="Cost"
            min="0"
          />
          <button onClick={() => removeMaterial(index)} className="btn-ghost text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button onClick={addMaterial} className="btn-ghost text-fixly-accent">
        + Add Material
      </button>
    </div>
  );
}
