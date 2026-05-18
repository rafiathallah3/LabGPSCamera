import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number;
}

export interface GeocodedAddress {
  city: string | null;
  district: string | null;
  region: string | null;       // province / state
  street: string | null;       // road name
  country: string | null;
  postalCode: string | null;
  name: string | null;         // place name / plus code
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [address, setAddress] = useState<GeocodedAddress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Reverse geocode whenever location changes significantly
  useEffect(() => {
    if (!location) return;

    let cancelled = false;

    const reverseGeocode = async () => {
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });

        if (!cancelled && results.length > 0) {
          const r = results[0];
          setAddress({
            city: r.city || null,
            district: r.district || r.subregion || null,
            region: r.region || null,
            street: r.street || null,
            country: r.country || null,
            postalCode: r.postalCode || null,
            name: r.name || null,
          });
        }
      } catch (err) {
        console.warn('Reverse geocoding failed:', err);
      }
    };

    reverseGeocode();

    return () => {
      cancelled = true;
    };
  }, [
    // Only re-geocode when coordinates change meaningfully (rounded to ~100m)
    location ? Math.round(location.latitude * 1000) : null,
    location ? Math.round(location.longitude * 1000) : null,
  ]);

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

  return { location, address, errorMsg, loading };
};
