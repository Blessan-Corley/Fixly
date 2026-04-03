'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { searchSkills } from '../../../../../data/cities';

import { normalizeStringArray } from './edit.utils';

type EditJobSkillsFieldProps = {
  skills: string[];
  error?: string;
  onAdd: (skill: string) => void;
  onRemove: (skill: string) => void;
};

export default function EditJobSkillsField({
  skills,
  error,
  onAdd,
  onRemove,
}: EditJobSkillsFieldProps) {
  const [skillSearch, setSkillSearch] = useState('');
  const [skillResults, setSkillResults] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (skillSearch.length > 0) {
      const results = normalizeStringArray(searchSkills(skillSearch) as unknown);
      setSkillResults(results);
      setShowDropdown(results.length > 0);
    } else {
      setSkillResults([]);
      setShowDropdown(false);
    }
  }, [skillSearch]);

  const handleAdd = (skill: string): void => {
    onAdd(skill);
    setSkillSearch('');
    setShowDropdown(false);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-fixly-text">Skills Required *</label>
      <div className="relative">
        <input
          type="text"
          value={skillSearch}
          onChange={(e) => setSkillSearch(e.target.value)}
          placeholder="Search and add skills..."
          className="input-field"
          onFocus={() => setShowDropdown(skillResults.length > 0)}
        />

        {showDropdown && skillResults.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-fixly-border bg-fixly-card shadow-lg">
            {skillResults.map((skill, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleAdd(skill)}
                className="hover:bg-fixly-hover w-full px-4 py-2 text-left text-fixly-text"
              >
                {skill}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <span key={index} className="skill-chip skill-chip-selected flex items-center">
            {skill}
            <button
              type="button"
              onClick={() => onRemove(skill)}
              className="ml-1 hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
