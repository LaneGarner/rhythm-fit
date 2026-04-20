import { useEffect } from 'react';
import * as Device from 'expo-device';
import * as ScreenOrientation from 'expo-screen-orientation';

export function useOrientationLock() {
  useEffect(() => {
    (async () => {
      try {
        const deviceType = await Device.getDeviceTypeAsync();
        if (deviceType === Device.DeviceType.PHONE) {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
          );
        }
      } catch {
        // Non-critical; ignore failures and let device default apply.
      }
    })();
  }, []);
}
