import { logger } from '../logger';
import { redisUtils } from '../redis';

import { updateCurrentLocation } from './currentLocation';
import type { HomeAddress } from './locationTracking.types';
import { LOCATION_CONFIG, parseJson } from './locationTracking.utils';

export const setHomeAddress = async (
  userId: string,
  addressData: HomeAddress
): Promise<HomeAddress> => {
  try {
    const homeAddressKey = `user_location:home:${userId}`;

    const homeAddress: HomeAddress = {
      ...addressData,
      setAt: new Date().toISOString(),
      locationType: 'home',
    };

    await redisUtils.setex(homeAddressKey, LOCATION_CONFIG.CACHE_TTL.HOME_ADDRESS, homeAddress);

    if (addressData.coordinates) {
      await updateCurrentLocation(
        userId,
        addressData.coordinates.lat,
        addressData.coordinates.lng,
        addressData.formattedAddress ?? null,
        'home'
      );
    }

    logger.info({ userId }, '[LocationTracking] Home address set');
    return homeAddress;
  } catch (error: unknown) {
    logger.error({ error, userId }, 'Error setting home address');
    throw error;
  }
};

export const getHomeAddress = async (userId: string): Promise<HomeAddress | null> => {
  try {
    const homeAddressKey = `user_location:home:${userId}`;
    const homeAddress = await redisUtils.get(homeAddressKey);
    return parseJson<HomeAddress | null>(homeAddress, null);
  } catch (error: unknown) {
    logger.error({ error, userId }, 'Error getting home address');
    return null;
  }
};
