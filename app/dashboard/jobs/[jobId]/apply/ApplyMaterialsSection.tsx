'use client';

import { Minus, Plus } from 'lucide-react';

import type { MaterialItem } from './apply.types';
import { formatCurrency } from './apply.utils';

type ApplyMaterialsSectionProps = {
  materialsIncluded: boolean;
  materialsList: MaterialItem[];
  totalMaterialCost: number;
  onToggle: (checked: boolean) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: <K extends keyof MaterialItem>(index: number, field: K, value: MaterialItem[K]) => void;
};

export default function ApplyMaterialsSection({
  materialsIncluded,
  materialsList,
  totalMaterialCost,
  onToggle,
  onAdd,
  onRemove,
  onUpdate,
}: ApplyMaterialsSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={materialsIncluded}
            onChange={(e) => onToggle(e.target.checked)}
            className="checkbox mr-2"
          />
          <span className="text-fixly-text">Materials will be included in my service</span>
        </label>
        <p className="mt-1 text-sm text-fixly-text-light">
          Check this if you'll provide all necessary materials and include their cost in your price
        </p>
      </div>

      {materialsIncluded && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-fixly-text">Materials List</label>
            <button type="button" onClick={onAdd} className="btn-secondary flex items-center text-sm">
              <Plus className="mr-1 h-3 w-3" />
              Add Item
            </button>
          </div>

          {materialsList.map((material, index) => (
            <div
              key={`material-${index}`}
              className="mb-3 rounded-lg border border-fixly-border p-3"
            >
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <input
                    type="text"
                    value={material.item}
                    onChange={(e) => onUpdate(index, 'item', e.target.value)}
                    placeholder="Material/item name"
                    className="input-field text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={material.quantity}
                    onChange={(e) =>
                      onUpdate(index, 'quantity', Math.max(1, Number(e.target.value) || 1))
                    }
                    placeholder="Qty"
                    min="1"
                    className="input-field text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    value={material.estimatedCost}
                    onChange={(e) =>
                      onUpdate(index, 'estimatedCost', Math.max(0, Number(e.target.value) || 0))
                    }
                    placeholder="Cost (Rs.)"
                    min="0"
                    className="input-field text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="btn-ghost w-full p-2 text-sm text-red-500"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {materialsList.length > 0 && (
            <div className="text-right text-sm text-fixly-text-light">
              Total estimated materials cost: Rs. {formatCurrency(totalMaterialCost)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

