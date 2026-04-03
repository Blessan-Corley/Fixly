'use client';

import { useEffect, useState } from 'react';

import { searchCities } from '../../../../../data/cities';

import type { CitySearchResult } from './edit.types';
import { normalizeCityResults } from './edit.utils';

type EditJobCityFieldProps = {
  address: string;
  city: string;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onSelect: (city: CitySearchResult) => void;
};

export default function EditJobCityField({
  address,
  city,
  errors,
  onChange,
  onSelect,
}: EditJobCityFieldProps) {
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (citySearch.length > 0) {
      const results = normalizeCityResults(searchCities(citySearch) as unknown);
      setCityResults(results);
      setShowDropdown(results.length > 0);
    } else {
      setCityResults([]);
      setShowDropdown(false);
    }
  }, [citySearch]);

  const handleSelect = (selectedCity: CitySearchResult): void => {
    onSelect(selectedCity);
    setCitySearch('');
    setShowDropdown(false);
  };

  const displayValue = citySearch || city;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-fixly-text">Address *</label>
        <input
          type="text"
          value={address}
          onChange={(e) => onChange('location.address', e.target.value)}
          placeholder="Enter full address"
          className={`input-field ${errors['location.address'] ? 'border-red-500 focus:border-red-500' : ''}`}
        />
        {errors['location.address'] && (
          <p className="mt-1 text-sm text-red-500">{errors['location.address']}</p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-fixly-text">City *</label>
        <div className="relative">
          <input
            type="text"
            value={displayValue}
            onChange={(e) => {
              setCitySearch(e.target.value);
              if (e.target.value !== city) {
                onChange('location.city', e.target.value);
              }
            }}
            placeholder="Search city"
            className={`input-field ${errors['location.city'] ? 'border-red-500 focus:border-red-500' : ''}`}
            onFocus={() => setShowDropdown(cityResults.length > 0)}
          />

          {showDropdown && cityResults.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-fixly-border bg-fixly-card shadow-lg">
              {cityResults.map((result, index) => (
                <button
                  key={`${result.name}-${result.state}-${index}`}
                  type="button"
                  onClick={() => handleSelect(result)}
                  className="hover:bg-fixly-hover w-full px-4 py-2 text-left text-fixly-text"
                >
                  {result.name}, {result.state}
                </button>
              ))}
            </div>
          )}
        </div>
        {errors['location.city'] && (
          <p className="mt-1 text-sm text-red-500">{errors['location.city']}</p>
        )}
      </div>
    </div>
  );
}
