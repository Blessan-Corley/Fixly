'use client';

import SkillSelector from '../../../components/SkillSelector/SkillSelector';
import type { ProfileUser } from '../../../types/profile';

import { ProfileSection } from './ProfilePageFields';

export type ProfileSkillsServicesSectionProps = {
  user: ProfileUser;
  editing: boolean;
  skills: string[];
  availableNow: boolean;
  serviceRadius: number;
  onEdit: () => void;
  onSkillsChange: (skills: string[]) => void;
  onAvailableNowChange: (value: boolean) => void;
  onServiceRadiusChange: (value: number) => void;
};

export function ProfileSkillsServicesSection({
  user,
  editing,
  skills,
  availableNow,
  serviceRadius,
  onEdit,
  onSkillsChange,
  onAvailableNowChange,
  onServiceRadiusChange,
}: ProfileSkillsServicesSectionProps): React.JSX.Element | null {
  if (user.role !== 'fixer') return null;

  return (
    <ProfileSection title="Skills & Services" editable={true} editing={editing} onEdit={onEdit}>
      {editing ? (
        <div className="space-y-4">
          <SkillSelector
            isModal={false}
            selectedSkills={skills}
            onSkillsChange={onSkillsChange}
            maxSkills={30}
            minSkills={1}
            required={false}
            className="w-full"
          />

          <div className="border-t border-fixly-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-fixly-text">Available Now</label>
                <p className="text-sm text-fixly-text-muted">
                  Show as available for immediate work
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={availableNow}
                  onChange={(e) => onAvailableNowChange(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-fixly-bg-secondary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-fixly-border after:bg-fixly-card after:transition-all after:content-[''] peer-checked:bg-fixly-accent peer-checked:after:translate-x-full peer-checked:after:border-fixly-card peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fixly-accent/25"></div>
              </label>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-fixly-text">
                Work Radius (km)
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={serviceRadius || 10}
                onChange={(e) => onServiceRadiusChange(parseInt(e.target.value, 10))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-fixly-text-muted">
                <span>1 km</span>
                <span>{serviceRadius} km</span>
                <span>50 km</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {user.skills && user.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.skills.map((skill: string, index: number) => (
                <span key={index} className="skill-chip">
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-fixly-text-muted">No skills added yet</p>
          )}

          <div className="flex items-center justify-between border-t border-fixly-border pt-4">
            <div>
              <span className="font-medium text-fixly-text">Availability</span>
              <p className="text-sm text-fixly-text-muted">
                Work radius: {user.serviceRadius || 10} km
              </p>
            </div>
            <div className="flex items-center">
              {user.availableNow ? (
                <>
                  <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-fixly-success"></div>
                  <span className="text-sm text-fixly-success">Available Now</span>
                </>
              ) : (
                <span className="text-sm text-fixly-text-muted">Not Available</span>
              )}
            </div>
          </div>
        </div>
      )}
    </ProfileSection>
  );
}
