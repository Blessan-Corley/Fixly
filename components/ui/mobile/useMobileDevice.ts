'use client';

import { useEffect, useState } from 'react';

type Orientation = 'portrait' | 'landscape';
type ScreenSize = 'small' | 'medium' | 'large';

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface MobileDeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  hasTouch: boolean;
  orientation: Orientation;
  screenSize: ScreenSize;
  safeAreaInsets: SafeAreaInsets;
}

const DEFAULT_SAFE_AREA_INSETS: SafeAreaInsets = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};

const DEFAULT_DEVICE_INFO: MobileDeviceInfo = {
  isMobile: false,
  isTablet: false,
  isDesktop: false,
  isIOS: false,
  isAndroid: false,
  hasTouch: false,
  orientation: 'portrait',
  screenSize: 'small',
  safeAreaInsets: DEFAULT_SAFE_AREA_INSETS,
};

function toSafeInset(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getScreenSize(width: number): ScreenSize {
  if (width < 640) return 'small';
  if (width < 1024) return 'medium';
  return 'large';
}

export function useMobileDevice(): MobileDeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<MobileDeviceInfo>(DEFAULT_DEVICE_INFO);

  useEffect(() => {
    const updateDeviceInfo = (): void => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /mobi|android/i.test(userAgent);
      const isTablet =
        /tablet|ipad/i.test(userAgent) || (isMobileDevice && window.innerWidth > 768);
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      const orientation: Orientation =
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

      const rootStyles = getComputedStyle(document.documentElement);
      const safeAreaInsets: SafeAreaInsets = {
        top: toSafeInset(rootStyles.getPropertyValue('--safe-area-inset-top')),
        bottom: toSafeInset(rootStyles.getPropertyValue('--safe-area-inset-bottom')),
        left: toSafeInset(rootStyles.getPropertyValue('--safe-area-inset-left')),
        right: toSafeInset(rootStyles.getPropertyValue('--safe-area-inset-right')),
      };

      setDeviceInfo({
        isMobile: isMobileDevice && !isTablet,
        isTablet,
        isDesktop: !isMobileDevice && !isTablet,
        isIOS,
        isAndroid,
        hasTouch,
        orientation,
        screenSize: getScreenSize(window.innerWidth),
        safeAreaInsets,
      });
    };

    updateDeviceInfo();

    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}
