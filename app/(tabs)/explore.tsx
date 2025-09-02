import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, Linking, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TouchableOpacity } from 'react-native';
import { FoodCard } from '@/components/ui/FoodCard';
import { LocationService, LocationCoords } from '@/services/locationService';
import { donationService } from '@/services/firebaseService';
import { FoodDonation } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function ExploreScreen() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentLocation();
    loadNearbyDonations();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadNearbyDonations = async () => {
    try {
      const availableDonations = await donationService.getAvailableDonations();
      setDonations(availableDonations);
    } catch (error) {
      console.error('Error loading donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = async (donation: FoodDonation) => {
    if (!currentLocation || !donation.pickupLocation) {
      Alert.alert('Error', 'Location not available for navigation');
      return;
    }

    try {
      const targetLocation: LocationCoords = {
        latitude: donation.pickupLocation.latitude,
        longitude: donation.pickupLocation.longitude,
      };

      const directionsUrl = LocationService.getDirectionsUrl(currentLocation, targetLocation);
      
      if (Platform.OS === 'web') {
        window.open(directionsUrl, '_blank');
      } else {
        const supported = await Linking.canOpenURL(directionsUrl);
        if (supported) {
          await Linking.openURL(directionsUrl);
        } else {
          // Fallback to Google Maps web
          const fallbackUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${targetLocation.latitude},${targetLocation.longitude}`;
          await Linking.openURL(fallbackUrl);
        }
      }
    } catch (error) {
      console.error('Error opening navigation:', error);
      Alert.alert('Error', 'Could not open navigation app');
    }
  };

  const getDonationDistance = (donation: FoodDonation): string => {
    if (!currentLocation || !donation.pickupLocation) return '';
    
    const distance = LocationService.calculateDistance(
      currentLocation,
      { latitude: donation.pickupLocation.latitude, longitude: donation.pickupLocation.longitude }
    );
    
    return `${distance} km away`;
  };

  const renderDonationItem = ({ item }: { item: FoodDonation }) => {
    const distance = getDonationDistance(item);
    const canNavigate = currentLocation && item.pickupLocation;

    return (
      <View style={styles.donationContainer}>
        <FoodCard
          donation={item}
          onPress={() => {}} // Empty onPress since we handle actions differently
          onActionPress={user?.role === 'ngo' ? () => handleClaimDonation(item) : undefined}
          actionLabel={user?.role === 'ngo' ? 'Claim' : undefined}
          onSecondaryActionPress={canNavigate ? () => handleNavigate(item) : undefined}
          secondaryActionLabel={canNavigate ? 'Navigate' : undefined}
        />
        {distance && (
          <ThemedText style={styles.distanceText}>{distance}</ThemedText>
        )}
      </View>
    );
  };

  const handleClaimDonation = async (donation: FoodDonation) => {
    if (!user || user.role !== 'ngo') return;

    try {
      await donationService.claimDonation(donation.id, user.id, user.name || 'NGO');
      Alert.alert('Success', 'Donation claimed successfully!');
      loadNearbyDonations(); // Refresh the list
    } catch (error) {
      console.error('Error claiming donation:', error);
      Alert.alert('Error', 'Failed to claim donation');
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading nearby donations...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Nearby Food Donations</ThemedText>
        {currentLocation && (
          <TouchableOpacity onPress={getCurrentLocation} style={styles.refreshButton}>
            <ThemedText style={styles.refreshText}>📍 Update Location</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {donations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>
            No donations available in your area
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={donations}
          renderItem={renderDonationItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  refreshText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  donationContainer: {
    marginBottom: 16,
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
});
