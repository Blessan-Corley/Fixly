'use client';

import { useState, useEffect } from 'react';

export function useMobileDevice() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isIOS: false,
    isAndroid: false,
    hasTouch: false,
    orientation: 'portrait',
    screenSize: 'small',
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 }
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /mobi|android/i.test(userAgent);
      const isTablet = /tablet|ipad/i.test(userAgent) || (isMobile && window.innerWidth > 768);
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      const screenSize = window.innerWidth < 640 ? 'small' :
                         window.innerWidth < 1024 ? 'medium' : 'large';

      // Detect safe area insets for iOS devices
      const safeAreaInsets = {
        top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0'),
        bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left') || '0'),
        right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right') || '0')
      };

      setDeviceInfo({
        isMobile: isMobile && !isTablet,
        isTablet,
        isDesktop: !isMobile && !isTablet,
        isIOS,
        isAndroid,
        hasTouch,
        orientation,
        screenSize,
        safeAreaInsets
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