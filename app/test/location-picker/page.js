'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Code, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import EnhancedLocationSelector from '../../../components/LocationPicker/EnhancedLocationSelector';

export default function LocationPickerTestPage() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [settings, setSettings] = useState({
    height: '400px',
    showQuickCities: true,
    allowCurrentLocation: true,
    mapType: 'roadmap',
    zoom: 10,
    theme: 'default',
    placeholder: 'Search for a location in India...'
  });
  const [copied, setCopied] = useState(false);

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    console.log('Location selected:', location);

    if (location) {
      toast.success(`Location selected: ${location.name || location.address || 'Unknown location'}`);
    }
  };

  const copyLocationData = () => {
    if (selectedLocation) {
      navigator.clipboard.writeText(JSON.stringify(selectedLocation, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Location data copied to clipboard!');
    }
  };

  const resetLocation = () => {
    setSelectedLocation(null);
    toast.info('Location selection reset');
  };

  return (
    <div className="min-h-screen bg-fixly-bg p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 bg-fixly-accent/10 border border-fixly-accent/20 rounded-full px-4 py-2 mb-4"
          >
            <MapPin className="h-5 w-5 text-fixly-accent" />
            <span className="text-sm font-medium text-fixly-accent">Location Picker Test</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold text-fixly-text mb-2"
          >
            Location Picker Component
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-fixly-text-light max-w-2xl mx-auto"
          >
            Interactive Google Maps integration with GPS detection, search functionality,
            India-only boundaries, Redis caching, and comprehensive mobile support.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="card order-2 lg:order-1"
          >
            <h2 className="text-xl font-semibold text-fixly-text mb-4 flex items-center">
              <Code className="h-5 w-5 mr-2" />
              Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fixly-text mb-1">
                  Map Height
                </label>
                <select
                  value={settings.height}
                  onChange={(e) => setSettings(prev => ({ ...prev, height: e.target.value }))}
                  className="input-field"
                >
                  <option value="300px">300px</option>
                  <option value="400px">400px</option>
                  <option value="500px">500px</option>
                  <option value="600px">600px</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-1">
                  Map Type
                </label>
                <select
                  value={settings.mapType}
                  onChange={(e) => setSettings(prev => ({ ...prev, mapType: e.target.value }))}
                  className="input-field"
                >
                  <option value="roadmap">Roadmap</option>
                  <option value="satellite">Satellite</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="terrain">Terrain</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-1">
                  Default Zoom
                </label>
                <input
                  type="range"
                  min="5"
                  max="18"
                  value={settings.zoom}
                  onChange={(e) => setSettings(prev => ({ ...prev, zoom: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-sm text-fixly-text-light mt-1">
                  Zoom: {settings.zoom}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-1">
                  Theme
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
                  className="input-field"
                >
                  <option value="default">Default</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showQuickCities}
                    onChange={(e) => setSettings(prev => ({ ...prev, showQuickCities: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-fixly-text">Quick Cities</span>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allowCurrentLocation}
                    onChange={(e) => setSettings(prev => ({ ...prev, allowCurrentLocation: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-fixly-text">GPS Detection</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-fixly-text mb-1">
                  Placeholder Text
                </label>
                <input
                  type="text"
                  value={settings.placeholder}
                  onChange={(e) => setSettings(prev => ({ ...prev, placeholder: e.target.value }))}
                  className="input-field"
                />
              </div>

              <button
                onClick={resetLocation}
                className="btn-ghost w-full"
              >
                Reset Location
              </button>
            </div>
          </motion.div>

          {/* Location Picker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 order-1 lg:order-2"
          >
            <div className="card">
              <h2 className="text-xl font-semibold text-fixly-text mb-4">
                Interactive Location Picker
              </h2>

              <EnhancedLocationSelector
                onLocationSelect={handleLocationSelect}
                initialLocation={selectedLocation}
                required={false}
                className="w-full"
              />
            </div>
          </motion.div>
        </div>

        {/* Selected Location Info */}
        {selectedLocation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-fixly-text flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Selected Location Data
                </h2>
                <button
                  onClick={copyLocationData}
                  className="btn-ghost flex items-center"
                >
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 overflow-auto">
                <pre className="text-sm text-gray-700">
                  {JSON.stringify(selectedLocation, null, 2)}
                </pre>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Coordinates</div>
                  <div className="text-blue-700 text-sm">
                    {selectedLocation.lat?.toFixed(6)}, {selectedLocation.lng?.toFixed(6)}
                  </div>
                </div>

                {selectedLocation.name && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm font-medium text-green-900">Name</div>
                    <div className="text-green-700 text-sm">{selectedLocation.name}</div>
                  </div>
                )}

                {selectedLocation.address && (
                  <div className="p-3 bg-fixly-accent/10 rounded-lg">
                    <div className="text-sm font-medium text-purple-900">Address</div>
                    <div className="text-fixly-primary text-sm">{selectedLocation.address}</div>
                  </div>
                )}

                {selectedLocation.placeId && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="text-sm font-medium text-orange-900">Place ID</div>
                    <div className="text-orange-700 text-sm font-mono text-xs">
                      {selectedLocation.placeId}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Usage Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <div className="card">
            <h2 className="text-xl font-semibold text-fixly-text mb-4">
              Usage Instructions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-fixly-text mb-2">Features</h3>
                <ul className="text-sm text-fixly-text-light space-y-1">
                  <li>• GPS auto-detection with permission handling</li>
                  <li>• Interactive Google Maps with India boundaries</li>
                  <li>• Search with Google Places API autocomplete</li>
                  <li>• Redis caching for API cost optimization</li>
                  <li>• Quick city selection for major Indian cities</li>
                  <li>• Mobile responsive design with touch support</li>
                  <li>• Keyboard navigation and accessibility</li>
                  <li>• Error boundaries with graceful fallbacks</li>
                  <li>• Multiple map types (roadmap, satellite, hybrid)</li>
                  <li>• Draggable markers with reverse geocoding</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-fixly-text mb-2">How to Use</h3>
                <ul className="text-sm text-fixly-text-light space-y-1">
                  <li>• Click &quot;Detect My Location&quot; to use GPS</li>
                  <li>• Type in the search box for autocomplete suggestions</li>
                  <li>• Click on the map to select a location</li>
                  <li>• Drag the marker to fine-tune position</li>
                  <li>• Use quick city buttons for common locations</li>
                  <li>• Switch map types using the control buttons</li>
                  <li>• All selections are limited to India boundaries</li>
                  <li>• Location data includes coordinates and address</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}