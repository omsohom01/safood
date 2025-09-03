import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { FoodCard } from '../../components/ui/FoodCard';
import { HamburgerMenu } from '../../components/ui/HamburgerMenu';
import { NavigationMap } from '../../components/ui/NavigationMap';
import { useAuth } from '../../contexts/AuthContext';
import { donationService } from '../../services/firebaseService';
import { LocationService } from '../../services/locationService';
import { FoodDonation } from '../../types';

// Known correct coordinates for common Indian locations
const KNOWN_LOCATIONS: { [key: string]: { latitude: number; longitude: number } } = {
  'barrackpore': { latitude: 22.7676, longitude: 88.3832 },
  'barrackpur': { latitude: 22.7676, longitude: 88.3832 },
  'kolkata': { latitude: 22.5726, longitude: 88.3639 },
  'calcutta': { latitude: 22.5726, longitude: 88.3639 },
  'mumbai': { latitude: 19.0760, longitude: 72.8777 },
  'delhi': { latitude: 28.7041, longitude: 77.1025 },
  'bangalore': { latitude: 12.9716, longitude: 77.5946 },
  'chennai': { latitude: 13.0827, longitude: 80.2707 },
  'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
  'pune': { latitude: 18.5204, longitude: 73.8567 },
};

// Function to fix incorrect coordinates
const fixCoordinatesIfNeeded = async (donation: FoodDonation): Promise<FoodDonation> => {
  const { latitude, longitude, address } = donation.pickupLocation;
  
  // Check if coordinates are outside India (rough bounding box)
  const isOutsideIndia = latitude < 6.4 || latitude > 37.6 || longitude < 68.7 || longitude > 97.25;
  
  if (isOutsideIndia) {
    console.log(`🔧 Fixing coordinates for ${address} - currently at ${latitude}, ${longitude}`);
    
    // Check for known locations first
    const addressLower = address.toLowerCase();
    for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
      if (addressLower.includes(key)) {
        console.log(`✅ Using known coordinates for ${key}: ${coords.latitude}, ${coords.longitude}`);
        return {
          ...donation,
          pickupLocation: {
            ...donation.pickupLocation,
            latitude: coords.latitude,
            longitude: coords.longitude,
          }
        };
      }
    }
    
    // Try to geocode the address correctly
    try {
      const correctedCoords = await LocationService.forwardGeocode(address);
      if (correctedCoords) {
        console.log(`✅ Geocoded ${address} to: ${correctedCoords.latitude}, ${correctedCoords.longitude}`);
        return {
          ...donation,
          pickupLocation: {
            ...donation.pickupLocation,
            latitude: correctedCoords.latitude,
            longitude: correctedCoords.longitude,
          }
        };
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
    }
    
    console.log(`⚠️ Could not fix coordinates for ${address}, keeping original`);
  }
  
  return donation;
};

export default function MapScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const router = useRouter();
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
  const [pickupMode, setPickupMode] = useState(false);
  const [pickupDetails, setPickupDetails] = useState<{
    id: string;
    address: string;
    latitude: number;
    longitude: number;
    donorName: string;
    foodTitle: string;
    donorPhone?: string;
    donorId?: string;
  } | null>(null);

  // Derive stable params to avoid effect thrashing
  const pickupId = typeof params.pickupId === 'string' ? (params.pickupId as string) : undefined;
  const pickupLat = typeof params.latitude === 'string' ? parseFloat(params.latitude as string) : undefined;
  const pickupLng = typeof params.longitude === 'string' ? parseFloat(params.longitude as string) : undefined;
  const pickupAddress = typeof params.pickupAddress === 'string' ? (params.pickupAddress as string) : undefined;
  const donorName = typeof params.donorName === 'string' ? (params.donorName as string) : undefined;
  const foodTitle = typeof params.foodTitle === 'string' ? (params.foodTitle as string) : undefined;

  // Function to validate if coordinates are in India
  const isValidIndianLocation = (lat: number, lng: number): boolean => {
    // India's approximate bounding box
    const indiaBounds = {
      north: 37.6,
      south: 6.4,
      east: 97.4,
      west: 68.1
    };
    
    return lat >= indiaBounds.south && lat <= indiaBounds.north &&
           lng >= indiaBounds.west && lng <= indiaBounds.east;
  };

  // Function to fix coordinates for known Indian locations
  const fixLocationCoordinates = async (address: string, currentLat: number, currentLng: number) => {
    // If current coordinates are already valid, keep them
    if (isValidIndianLocation(currentLat, currentLng)) {
      return { latitude: currentLat, longitude: currentLng };
    }

    // Known correct coordinates for common locations
    const knownLocations: { [key: string]: { latitude: number; longitude: number } } = {
      'barrackpore': { latitude: 22.7676, longitude: 88.3715 }, // Barrackpore, West Bengal
      'barrackpur': { latitude: 22.7676, longitude: 88.3715 },
      'kolkata': { latitude: 22.5726, longitude: 88.3639 },
      'delhi': { latitude: 28.7041, longitude: 77.1025 },
      'mumbai': { latitude: 19.0760, longitude: 72.8777 },
      'bangalore': { latitude: 12.9716, longitude: 77.5946 },
      'chennai': { latitude: 13.0827, longitude: 80.2707 },
      'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
      'pune': { latitude: 18.5204, longitude: 73.8567 },
    };

    // Check if it's a known location
    const addressLower = address.toLowerCase();
    for (const [city, coords] of Object.entries(knownLocations)) {
      if (addressLower.includes(city)) {
        console.log(`Using known coordinates for ${city}:`, coords);
        return coords;
      }
    }

    // Try to get correct coordinates using enhanced geocoding
    try {
      const correctCoords = await LocationService.forwardGeocode(address);
      if (correctCoords && isValidIndianLocation(correctCoords.latitude, correctCoords.longitude)) {
        console.log(`Fixed location for ${address}:`, correctCoords);
        return correctCoords;
      }
    } catch (error) {
      console.error('Error fixing coordinates:', error);
    }

    // Return original coordinates as fallback
    return { latitude: currentLat, longitude: currentLng };
  };

  // 1) Handle pickup params independently (stable, only when params change)
  useEffect(() => {
    // Check if we have pickup navigation parameters
    if (pickupId && pickupLat != null && pickupLng != null) {
      setPickupMode(true);
      
      // Load full donation details to get donor info
      const loadDonationDetails = async () => {
        try {
          const donation = await donationService.getDonationById(pickupId);
          if (donation) {
            const donor = await donationService.getUserById(donation.donorId);
            setPickupDetails({
              id: pickupId,
              address: pickupAddress || donation.pickupLocation.address || '',
              latitude: pickupLat,
              longitude: pickupLng,
              donorName: donorName || donation.donorName || '',
              foodTitle: foodTitle || donation.title || '',
              donorPhone: donor?.phone,
              donorId: donation.donorId,
            });
          } else {
            // Fallback to params only
            setPickupDetails({
              id: pickupId,
              address: pickupAddress || '',
              latitude: pickupLat,
              longitude: pickupLng,
              donorName: donorName || '',
              foodTitle: foodTitle || '',
            });
          }
        } catch (error) {
          console.error('Error loading donation details:', error);
          // Fallback to params only
          setPickupDetails({
            id: pickupId,
            address: pickupAddress || '',
            latitude: pickupLat,
            longitude: pickupLng,
            donorName: donorName || '',
            foodTitle: foodTitle || '',
          });
        }
      };

      loadDonationDetails();

      // Set map region to pickup location
      setMapRegion({
        latitude: pickupLat,
        longitude: pickupLng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      setPickupMode(false);
      setPickupDetails(null);
    }
  }, [pickupId, pickupLat, pickupLng, pickupAddress, donorName, foodTitle]);

  // 2) Get user location once on mount (don’t tie to changing deps)
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // 3) Load and subscribe to donations when user/role becomes available
  useEffect(() => {
    if (!user) return;
    loadDonations();
    let unsubscribe: (() => void) | null = null;
    if (user.role === 'ngo') {
      unsubscribe = donationService.subscribeToAvailableDonations(setDonations);
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [user?.id, user?.role]);

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
      
      // Fix coordinates for donations with invalid locations
      const fixedDonations = await Promise.all(
        availableDonations.map(async (donation) => {
          const { latitude, longitude } = donation.pickupLocation;
          
          if (!isValidIndianLocation(latitude, longitude)) {
            console.log(`Invalid location detected for donation ${donation.id}: ${donation.pickupLocation.address}`);
            const fixedCoords = await fixLocationCoordinates(
              donation.pickupLocation.address,
              latitude,
              longitude
            );
            
            return {
              ...donation,
              pickupLocation: {
                ...donation.pickupLocation,
                latitude: fixedCoords.latitude,
                longitude: fixedCoords.longitude,
              }
            };
          }
          
          return donation;
        })
      );
      
      setDonations(fixedDonations);
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
        <HamburgerMenu currentRoute="/(tabs)/map" />
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
      <HamburgerMenu currentRoute="/(tabs)/map" />
      
      {/* Pickup Navigation Mode */}
      {pickupMode && pickupDetails ? (
        <View style={styles.pickupNavigationContainer}>
          <View style={styles.pickupHeader}>
            <View style={styles.pickupHeaderTop}>
              <Text style={styles.pickupTitle}>Navigation to Pickup</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => {
                  setPickupMode(false);
                  setPickupDetails(null);
                  router.replace('/(tabs)/map');
                }}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.pickupSubtitle}>{pickupDetails.foodTitle}</Text>
          </View>
          
          <View style={styles.pickupDetailsCard}>
            <View style={styles.pickupInfoRow}>
              <Ionicons name="person-outline" size={20} color="#22c55e" />
              <Text style={styles.pickupInfoText}>Donor: {pickupDetails.donorName}</Text>
            </View>
            <View style={styles.pickupInfoRow}>
              <Ionicons name="location-outline" size={20} color="#22c55e" />
              <Text style={styles.pickupInfoText}>{pickupDetails.address}</Text>
            </View>
          </View>
          
          <View style={styles.pickupMapArea}>
            <NavigationMap
              destination={{
                latitude: pickupDetails.latitude,
                longitude: pickupDetails.longitude,
                address: pickupDetails.address,
              }}
              donorName={pickupDetails.donorName}
              foodTitle={pickupDetails.foodTitle}
            />
          </View>
          
          <View style={styles.pickupActions}>
            <TouchableOpacity 
              style={styles.directionsButton}
              onPress={async () => {
                if (pickupDetails?.donorPhone) {
                  Alert.alert(
                    'Contact Donor',
                    `Call ${pickupDetails.donorName} for pickup instructions?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Call', 
                        onPress: async () => {
                          try {
                            const phoneUrl = `tel:${pickupDetails.donorPhone}`;
                            const canCall = await Linking.canOpenURL(phoneUrl);
                            if (canCall) {
                              await Linking.openURL(phoneUrl);
                            } else {
                              Alert.alert('Error', 'Unable to make phone calls on this device');
                            }
                          } catch (error) {
                            console.error('Error making phone call:', error);
                            Alert.alert('Error', 'Failed to initiate phone call');
                          }
                        }
                      }
                    ]
                  );
                } else {
                  Alert.alert(
                    'Contact Information',
                    'Donor phone number not available. Please contact them through the app or NGO.',
                    [{ text: 'OK' }]
                  );
                }
              }}
            >
              <Ionicons name="call" size={20} color="#ffffff" />
              <Text style={styles.directionsButtonText}>Contact Donor</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.callButton}
              onPress={() => {
                setPickupMode(false);
                setPickupDetails(null);
                router.replace('/(tabs)/map');
              }}
            >
              <Ionicons name="close" size={20} color="#22c55e" />
              <Text style={styles.callButtonText}>End Navigation</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
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
        </>
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
  // Pickup Navigation Styles
  pickupNavigationContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  pickupHeader: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickupHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  pickupSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  pickupDetailsCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pickupInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickupInfoText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  pickupMapArea: {
    flex: 1,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mapPlaceholder: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 200,
  },
  mapPlaceholderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  pickupActions: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 0,
    gap: 12,
  },
  directionsButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  directionsButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  callButtonText: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});
