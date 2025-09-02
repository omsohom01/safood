import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { FoodCard } from '../../components/ui/FoodCard';
import { Button } from '../../components/ui/Button';
import { donationService } from '../../services/firebaseService';
import { FoodDonation } from '../../types';

export default function MapScreen() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [selectedDonation, setSelectedDonation] = useState<FoodDonation | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    loadDonations();
    // Subscribe to live updates for availability
    if (!user) return;
    let unsubscribe: (() => void) | null = null;
    if (user.role === 'ngo') {
      unsubscribe = donationService.subscribeToAvailableDonations(setDonations);
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [user]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required to show nearby donations');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadDonations = async () => {
    if (!user) return;

    try {
      let availableDonations: FoodDonation[] = [];
      
      if (user.role === 'ngo') {
        availableDonations = await donationService.getAvailableDonations();
      } else if (user.role === 'volunteer') {
        availableDonations = await donationService.getAvailablePickups();
      }
      
      setDonations(availableDonations);
    } catch (error) {
      console.error('Error loading donations:', error);
    }
  };

  const handleMarkerPress = (donation: FoodDonation) => {
    setSelectedDonation(donation);
  };

  const handleClaimDonation = async (donationId: string) => {
    if (!user || user.role !== 'ngo') return;
    
    setLoading(true);
    try {
      await donationService.claimDonation(donationId, user.id, user.name);
      setSelectedDonation(null);
      loadDonations(); // Refresh donations
      Alert.alert('Success', 'Donation claimed successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to claim donation');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPickup = async (donationId: string) => {
    if (!user || user.role !== 'volunteer') return;
    
    setLoading(true);
    try {
  await donationService.acceptPickupRequest(donationId, user.id, user.name);
      setSelectedDonation(null);
      loadDonations(); // Refresh donations
      Alert.alert('Success', 'Pickup accepted successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept pickup');
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (donation: FoodDonation) => {
    if (donation.isUrgent) return '#ef4444';
    if (donation.status === 'listed') return '#22c55e';
    if (donation.status === 'claimed') return '#f97316';
    return '#6b7280';
  };

  const getActionButton = () => {
    if (!selectedDonation) return null;

    if (user?.role === 'ngo' && selectedDonation.status === 'listed') {
      return (
        <Button
          title="Claim Donation"
          onPress={() => handleClaimDonation(selectedDonation.id)}
          loading={loading}
          style={styles.actionButton}
        />
      );
    }

    if (user?.role === 'volunteer' && selectedDonation.status === 'claimed') {
      return (
        <Button
          title="Accept Pickup"
          onPress={() => handleAcceptPickup(selectedDonation.id)}
          loading={loading}
          style={styles.actionButton}
        />
      );
    }

    return null;
  };

  if (!user || (user.role !== 'ngo' && user.role !== 'volunteer')) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="map-outline" size={64} color="#9ca3af" />
          <Text style={styles.errorTitle}>Map View</Text>
          <Text style={styles.errorText}>
            Map view is available for NGOs and Volunteers to find donations and pickups.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {user.role === 'ngo' ? 'Find Donations' : 'Find Pickups'}
        </Text>
        <Text style={styles.subtitle}>
          {donations.length} available nearby
        </Text>
      </View>

      <View style={styles.mapContainer}>
        {/* Unified donation list view for all platforms */}
        <View style={styles.webMapFallback}>
          <View style={styles.webMapHeader}>
            <Ionicons name="map-outline" size={32} color="#22c55e" />
            <Text style={styles.webMapTitle}>Donation Map</Text>
            <Text style={styles.webMapSubtitle}>
              {Platform.OS === 'web' 
                ? 'Interactive map is available on mobile devices' 
                : 'Map feature coming soon'}
            </Text>
          </View>
          <View style={styles.donationsList}>
            {donations.map((donation) => (
              <TouchableOpacity
                key={donation.id}
                style={styles.donationListItem}
                onPress={() => handleMarkerPress(donation)}
              >
                <View style={styles.donationListContent}>
                  <View style={[styles.statusDot, { backgroundColor: getMarkerColor(donation) }]} />
                  <View style={styles.donationInfo}>
                    <Text style={styles.donationTitle}>{donation.title}</Text>
                    <Text style={styles.donationLocation}>
                      {donation.pickupLocation.address}
                    </Text>
                    <Text style={styles.donationQuantity}>
                      Deadline: {donation.deadline.toLocaleDateString()} {donation.deadline.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </Text>
                  </View>
                  {donation.isUrgent && (
                    <View style={styles.urgentIndicator}>
                      <Ionicons name="warning" size={16} color="#ef4444" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
            <Text style={styles.legendText}>Claimed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Urgent</Text>
          </View>
        </View>

        {/* Refresh Button */}
        <TouchableOpacity style={styles.refreshButton} onPress={loadDonations}>
          <Ionicons name="refresh" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Selected Donation Details */}
      {selectedDonation && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>Donation Details</Text>
            <TouchableOpacity onPress={() => setSelectedDonation(null)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <FoodCard
            donation={selectedDonation}
            onPress={() => {}}
            showStatus={true}
            style={styles.selectedCard}
          />

          {getActionButton()}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    position: 'relative',
  },
  urgentBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  legend: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  detailsContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '50%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  selectedCard: {
    marginBottom: 16,
    shadowOpacity: 0.05,
    elevation: 2,
  },
  actionButton: {
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Web fallback styles
  webMapFallback: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webMapHeader: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  webMapTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  webMapSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  donationsList: {
    flex: 1,
    padding: 16,
  },
  donationListItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  donationListContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  donationInfo: {
    flex: 1,
  },
  donationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  donationLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  donationQuantity: {
    fontSize: 12,
    color: '#9ca3af',
  },
  urgentIndicator: {
    marginLeft: 8,
  },
});
