import { locationPreferenceSchema } from './schema';
import type { LocationPreferenceModel } from './types';

locationPreferenceSchema.statics.findNearbyUsers = function (
  this: LocationPreferenceModel,
  lat: number,
  lng: number,
  radiusKm = 10
) {
  return this.find({
    'currentLocation.lat': { $exists: true, $ne: null },
    'currentLocation.lng': { $exists: true, $ne: null },
    'preferences.autoLocationEnabled': true,
    'preferences.locationSharingConsent': true,
  })
    .where({
      $expr: {
        $lte: [
          {
            $multiply: [
              6371,
              {
                $acos: {
                  $add: [
                    {
                      $multiply: [
                        { $sin: { $degreesToRadians: lat } },
                        { $sin: { $degreesToRadians: '$currentLocation.lat' } },
                      ],
                    },
                    {
                      $multiply: [
                        { $cos: { $degreesToRadians: lat } },
                        { $cos: { $degreesToRadians: '$currentLocation.lat' } },
                        {
                          $cos: {
                            $degreesToRadians: { $subtract: ['$currentLocation.lng', lng] },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
          radiusKm,
        ],
      },
    })
    .exec();
};
