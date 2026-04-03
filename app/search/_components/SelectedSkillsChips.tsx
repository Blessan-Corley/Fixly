import { X } from 'lucide-react';

type SelectedSkillsChipsProps = {
  selectedSkills: string[];
  onRemoveSkill: (skill: string) => void;
};

export function SelectedSkillsChips({
  selectedSkills,
  onRemoveSkill,
}: SelectedSkillsChipsProps): React.JSX.Element | null {
  if (selectedSkills.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {selectedSkills.map((skill, index) => (
        <span
          key={`${skill}-${index}`}
          className="flex items-center rounded-full bg-fixly-accent-light px-3 py-1 text-sm text-fixly-accent"
        >
          {skill}
          <button
            type="button"
            onClick={() => onRemoveSkill(skill)}
            className="ml-2 hover:text-red-500"
            aria-label={`Remove ${skill}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
