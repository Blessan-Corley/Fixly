'use client';

import { LocationBanner } from './LocationBanner';
import { LocationModal } from './LocationModal';
import { type LocationPermissionProps } from './LocationPermission.utils';
import { useLocationPermission } from './useLocationPermission';

export default function LocationPermission({
  onLocationUpdate,
  showBanner = true,
  className = '',
}: LocationPermissionProps): React.JSX.Element {
  const {
    internalShowBanner,
    setInternalShowBanner,
    locationState,
    userLocation,
    showPermissionModal,
    setShowPermissionModal,
    loading,
    error,
    requestLocation,
    disableLocation,
  } = useLocationPermission(showBanner, onLocationUpdate);

  return (
    <div className={className}>
      <LocationBanner
        locationState={locationState}
        internalShowBanner={internalShowBanner}
        onOpenModal={() => setShowPermissionModal(true)}
        onDismiss={() => setInternalShowBanner(false)}
      />
      <LocationModal
        showPermissionModal={showPermissionModal}
        error={error}
        loading={loading}
        onClose={() => setShowPermissionModal(false)}
        onDisable={disableLocation}
        onRequest={requestLocation}
      />

      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 rounded bg-black px-2 py-1 text-xs text-white">
          Location: {locationState}{' '}
          {userLocation ? `(${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})` : ''}
        </div>
      )}
    </div>
  );
}
