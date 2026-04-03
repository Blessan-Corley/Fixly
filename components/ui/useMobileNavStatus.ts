'use client';

import { useState, useEffect } from 'react';

interface BatteryManagerLike {
  level: number;
  addEventListener: (type: 'levelchange', listener: () => void) => void;
  removeEventListener: (type: 'levelchange', listener: () => void) => void;
}

interface NetworkConnectionLike {
  effectiveType?: string;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
}

interface NavigatorWithEnhancements extends Navigator {
  connection?: NetworkConnectionLike;
  getBattery?: () => Promise<BatteryManagerLike>;
}

export type MobileConnectionType = 'wifi' | '2g' | '3g' | '4g' | '5g' | 'unknown';

const normalizeConnectionType = (value: string | undefined): MobileConnectionType => {
  if (!value) return 'unknown';
  if (value === '2g' || value === '3g' || value === '4g' || value === '5g') return value;
  return 'unknown';
};

export interface MobileNavStatus {
  networkStatus: boolean;
  batteryLevel: number | null;
  connectionType: MobileConnectionType;
}

export function useMobileNavStatus(): MobileNavStatus {
  const [networkStatus, setNetworkStatus] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [connectionType, setConnectionType] = useState<MobileConnectionType>('wifi');

  useEffect(() => {
    const enhancedNavigator = navigator as NavigatorWithEnhancements;
    const connection = enhancedNavigator.connection;

    const updateNetworkStatus = (): void => {
      setNetworkStatus(window.navigator.onLine);
    };

    const updateConnection = (): void => {
      setConnectionType(normalizeConnectionType(connection?.effectiveType));
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    connection?.addEventListener?.('change', updateConnection);

    updateNetworkStatus();
    updateConnection();

    let cleanupBatteryListener: (() => void) | undefined;
    if (typeof enhancedNavigator.getBattery === 'function') {
      void enhancedNavigator
        .getBattery()
        .then((battery) => {
          const updateBattery = (): void => {
            setBatteryLevel(Math.round(battery.level * 100));
          };

          updateBattery();
          battery.addEventListener('levelchange', updateBattery);
          cleanupBatteryListener = () => {
            battery.removeEventListener('levelchange', updateBattery);
          };
        })
        .catch(() => {
          setBatteryLevel(null);
        });
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      connection?.removeEventListener?.('change', updateConnection);
      cleanupBatteryListener?.();
    };
  }, []);

  return { networkStatus, batteryLevel, connectionType };
}
