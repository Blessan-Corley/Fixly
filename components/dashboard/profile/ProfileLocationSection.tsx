'use client';

import { Clock, MapPin, Target, X } from 'lucide-react';

import type { LocationHistoryItem, ProfileLocation, ProfileUser } from '../../../types/profile';

import { ProfileSection } from './ProfilePageFields';

export type ProfileLocationSectionProps = {
  user: ProfileUser;
  editing: boolean;
  location: ProfileLocation | null;
  onEdit: () => void;
  onClearLocation: () => void;
  onOpenLocationPicker: () => void;
};

export function ProfileLocationSection({
  user,
  editing,
  location,
  onEdit,
  onClearLocation,
  onOpenLocationPicker,
}: ProfileLocationSectionProps): React.JSX.Element {
  return (
    <ProfileSection title="Location" editable={true} editing={editing} onEdit={onEdit}>
      {editing ? (
        <div>
          <label className="mb-2 block text-sm font-medium text-fixly-text">Location</label>
          <div className="space-y-3">
            {location ? (
              <div className="flex items-center justify-between rounded-lg bg-fixly-bg-secondary p-3">
                <div className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4 text-fixly-accent" />
                  <div>
                    <div className="font-medium text-fixly-text">
                      {location.name || location.city || location.homeAddress?.city}
                    </div>
                    {location.state ? (
                      <div className="text-sm text-fixly-text-muted">{location.state}</div>
                    ) : null}
                    {location.homeAddress?.formattedAddress ? (
                      <div className="mt-1 text-xs text-fixly-text-muted">
                        {location.homeAddress.formattedAddress}
                      </div>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={onClearLocation}
                  className="text-fixly-text-muted hover:text-fixly-error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-fixly-border py-4 text-center">
                <MapPin className="mx-auto mb-2 h-8 w-8 text-fixly-text-muted" />
                <p className="mb-3 text-fixly-text-muted">No location selected</p>
              </div>
            )}

            <button onClick={onOpenLocationPicker} className="btn-primary w-full">
              <Target className="mr-2 h-4 w-4" />
              {location ? 'Change Location' : 'Select Location'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {user.location && (user.location.city || user.location.homeAddress?.formattedAddress) ? (
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <MapPin className="mr-3 mt-1 h-4 w-4 text-fixly-accent" />
                <div>
                  <div className="font-medium text-fixly-text">
                    {user.location.city ||
                      user.location.homeAddress?.district ||
                      'Current Location'}
                  </div>
                  {user.location.state ? (
                    <div className="text-sm text-fixly-text-muted">{user.location.state}</div>
                  ) : null}
                  {user.location.homeAddress?.formattedAddress ? (
                    <div className="mt-1 max-w-xs text-xs text-fixly-text-muted">
                      {user.location.homeAddress.formattedAddress}
                    </div>
                  ) : null}
                  {user.location.homeAddress?.coordinates ? (
                    <div className="mt-1 flex items-center text-xs text-fixly-accent">
                      <Target className="mr-1 h-3 w-3" />
                      GPS: {user.location.homeAddress.coordinates.latitude?.toFixed(4)},{' '}
                      {user.location.homeAddress.coordinates.longitude?.toFixed(4)}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="text-right">
                {user.location.accuracy ? (
                  <span className="rounded bg-fixly-bg px-2 py-1 text-xs text-fixly-text-muted">
                    ±{Math.round(user.location.accuracy)}m
                  </span>
                ) : null}
                {user.location.timestamp ? (
                  <div className="mt-1 text-xs text-fixly-text-muted">
                    Updated {new Date(user.location.timestamp).toLocaleDateString()}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-fixly-border py-6 text-center">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-fixly-text-muted" />
              <p className="mb-3 text-fixly-text-muted">No location set</p>
              <p className="text-xs text-fixly-text-muted">
                Add your location to help hirers find you nearby
              </p>
            </div>
          )}

          {user.locationHistory && user.locationHistory.length > 0 ? (
            <div className="mt-3 border-t border-fixly-border pt-3">
              <div className="mb-2 flex items-center text-xs font-medium text-fixly-text-muted">
                <Clock className="mr-1 h-3 w-3" />
                Recent Locations
              </div>
              <div className="max-h-20 space-y-1 overflow-y-auto">
                {user.locationHistory.slice(0, 3).map((loc: LocationHistoryItem, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1 text-xs text-fixly-text-muted"
                  >
                    <span className="truncate">
                      {loc.city || loc.address || 'Unknown location'}
                    </span>
                    <span className="ml-2 text-xs">
                      {new Date(loc.timestamp ?? Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </ProfileSection>
  );
}
