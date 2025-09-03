import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface DetailedAddress {
  street?: string;
  houseNumber?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  fullAddress: string;
}

export class LocationService {
  // Get current location with high accuracy
  static async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 1,
      });

      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  // Enhanced reverse geocoding using OpenStreetMap Nominatim
  static async reverseGeocode(coords: LocationCoords): Promise<DetailedAddress | null> {
    try {
      const { latitude, longitude } = coords;
      
      if (Platform.OS === 'web') {
        // Use OpenStreetMap Nominatim for web
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'FoodRescueApp/1.0'
          },
        });

        if (!response.ok) return null;
        
        const data = await response.json();
        const address = data?.address || {};
        
        return {
          street: address.road,
          houseNumber: address.house_number,
          city: address.city || address.town || address.village,
          state: address.state,
          country: address.country,
          postcode: address.postcode,
          fullAddress: data.display_name || this.formatAddress(address)
        };
      } else {
        // Use Expo Location for native platforms
        const results = await Location.reverseGeocodeAsync(coords);
        if (results.length === 0) return null;
        
        const result = results[0];
        const parts = [
          [result.street, result.streetNumber].filter(Boolean).join(' '),
          result.city,
          result.region,
          result.postalCode,
          result.country,
        ].filter(Boolean);
        
        return {
          street: result.street || undefined,
          houseNumber: result.streetNumber || undefined,
          city: result.city || undefined,
          state: result.region || undefined,
          country: result.country || undefined,
          postcode: result.postalCode || undefined,
          fullAddress: parts.join(', ')
        };
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // Forward geocoding - search for coordinates by address
  static async forwardGeocode(address: string): Promise<LocationCoords | null> {
    try {
      if (Platform.OS === 'web') {
        // Prioritize India locations by adding country bias
        const enhancedAddress = address.toLowerCase().includes('india') || 
                              address.toLowerCase().includes('bengal') ||
                              address.toLowerCase().includes('kolkata') ||
                              address.toLowerCase().includes('west bengal')
          ? address
          : `${address}, India`;
          
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enhancedAddress)}&limit=5&countrycodes=in&bounded=1&viewbox=68.1766451354,37.6017073906,97.4025614766,6.4626999097`;
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'FoodRescueApp/1.0'
          },
        });

        if (!response.ok) return null;
        
        const data = await response.json();
        if (data.length === 0) {
          // Try again without India bias if no results
          const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
          const fallbackResponse = await fetch(fallbackUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'FoodRescueApp/1.0'
            },
          });
          
          if (!fallbackResponse.ok) return null;
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.length === 0) return null;
          
          return {
            latitude: parseFloat(fallbackData[0].lat),
            longitude: parseFloat(fallbackData[0].lon)
          };
        }
        
        // Prefer results in India
        const indiaResult = data.find((result: any) => 
          result.display_name.toLowerCase().includes('india') ||
          result.display_name.toLowerCase().includes('west bengal') ||
          result.display_name.toLowerCase().includes('bengal')
        );
        
        const bestResult = indiaResult || data[0];
        
        return {
          latitude: parseFloat(bestResult.lat),
          longitude: parseFloat(bestResult.lon)
        };
      } else {
        const results = await Location.geocodeAsync(address);
        if (results.length === 0) return null;
        
        return {
          latitude: results[0].latitude,
          longitude: results[0].longitude
        };
      }
    } catch (error) {
      console.error('Error forward geocoding:', error);
      return null;
    }
  }

  // Calculate distance between two points (in kilometers)
  static calculateDistance(point1: LocationCoords, point2: LocationCoords): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(point2.latitude - point1.latitude);
    const dLon = this.toRad(point2.longitude - point1.longitude);
    const lat1 = this.toRad(point1.latitude);
    const lat2 = this.toRad(point2.latitude);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;

    return Math.round(d * 100) / 100; // Round to 2 decimal places
  }

  // Get directions URL for navigation
  static getDirectionsUrl(from: LocationCoords, to: LocationCoords): string {
    if (Platform.OS === 'ios') {
      return `maps://app?saddr=${from.latitude},${from.longitude}&daddr=${to.latitude},${to.longitude}`;
    } else if (Platform.OS === 'android') {
      return `google.navigation:q=${to.latitude},${to.longitude}`;
    } else {
      // Web fallback to OpenStreetMap directions
      return `https://www.openstreetmap.org/directions?from=${from.latitude}%2C${from.longitude}&to=${to.latitude}%2C${to.longitude}&route=car`;
    }
  }

  // Watch position for real-time tracking
  static async watchPosition(
    callback: (location: Location.LocationObject) => void,
    errorCallback?: (error: any) => void
  ): Promise<{ remove: () => void } | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        callback
      );

      return subscription;
    } catch (error) {
      console.error('Error watching position:', error);
      if (errorCallback) errorCallback(error);
      return null;
    }
  }

  private static toRad(value: number): number {
    return value * Math.PI / 180;
  }

  private static formatAddress(address: any): string {
    const parts = [
      [address.road, address.house_number].filter(Boolean).join(' '),
      address.suburb || address.neighbourhood,
      address.city || address.town || address.village,
      address.state,
      address.postcode,
      address.country,
    ].filter(Boolean);
    return parts.join(', ');
  }
}
