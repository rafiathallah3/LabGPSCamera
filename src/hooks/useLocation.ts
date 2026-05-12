import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number;
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoading(false);
          return;
        }

        // Get initial location
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setLocation({
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
          altitude: initialLocation.coords.altitude,
          accuracy: initialLocation.coords.accuracy,
          timestamp: initialLocation.timestamp,
        });
        setLoading(false);

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (newLocation) => {
            setLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              altitude: newLocation.coords.altitude,
              accuracy: newLocation.coords.accuracy,
              timestamp: newLocation.timestamp,
            });
          }
        );
      } catch (err) {
        setErrorMsg('Error fetching location');
        setLoading(false);
        console.error(err);
      }
    };

    startWatching();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  return { location, errorMsg, loading };
};
