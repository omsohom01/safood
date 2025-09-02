import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LocationService } from '../../services/locationService';
import { useAuth } from '../../contexts/AuthContext';
import { FoodCard } from '../../components/ui/FoodCard';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import VolunteerDashboard from '../../components/ui/VolunteerDashboard';
import { donationService, analyticsService } from '../../services/firebaseService';
import { FoodDonation, NGOAnalytics, VolunteerStats } from '../../types';

export default function HomeScreen() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [analytics, setAnalytics] = useState<NGOAnalytics | null>(null);
  const [volunteerStats, setVolunteerStats] = useState<VolunteerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // If user is a volunteer, show the dedicated volunteer dashboard
  if (user?.role === 'volunteer') {
    return <VolunteerDashboard />;
  }

  useEffect(() => {
    loadData();
    // Subscribe to real-time updates per role
    if (!user) return;
    let unsubscribe: (() => void) | null = null;
    if (user.role === 'donor') {
      unsubscribe = donationService.subscribeToUserDonations(user.id, setDonations);
    } else if (user.role === 'ngo') {
      unsubscribe = donationService.subscribeToAvailableDonations((items) => {
        // Combine live listed with already-claimed by this NGO
        setDonations((prev) => {
          const claimed = prev.filter(d => d.claimedBy === user.id);
          const map = new Map<string, any>();
          [...claimed, ...items].forEach(d => map.set(d.id, d));
          return Array.from(map.values());
        });
      });
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      if (user.role === 'donor') {
  const userDonations = await donationService.getDonationsByUser(user.id);
  setDonations(userDonations);
      } else if (user.role === 'ngo') {
        const availableDonations = await donationService.getAvailableDonations();
        const claimedDonations = await donationService.getClaimedDonations(user.id);
        setDonations([...claimedDonations, ...availableDonations.slice(0, 5)]);
        
        const ngoAnalytics = await analyticsService.getNGOAnalytics(user.id);
        setAnalytics(ngoAnalytics);
      } else if (user.role === 'volunteer') {
        const availablePickups = await donationService.getPendingPickupRequests(user.id);
        setDonations(availablePickups);
        
        // Get volunteer stats would require implementation
        // const stats = await analyticsService.getVolunteerStats(user.id);
        // setVolunteerStats(stats);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDonationPress = (donation: FoodDonation) => {
    // Navigate to donation details
    console.log('Navigate to donation:', donation.id);
  };

  const handleClaimDonation = async (donationId: string) => {
    if (!user || user.role !== 'ngo') return;
    
    try {
      await donationService.claimDonation(donationId, user.id, user.name);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error claiming donation:', error);
    }
  };

  const handleAcceptPickup = async (donationId: string) => {
    if (!user || user.role !== 'volunteer') return;
    
    try {
      // Find the donation to get donor address
      const donation = donations.find(d => d.id === donationId);
      if (!donation) {
        Alert.alert('Error', 'Donation not found');
        return;
      }

      // Accept the pickup request with enhanced validation
      await donationService.acceptPickupRequest(donationId, user.id, user.name);
      loadData(); // Refresh data

      // Automatic navigation to donor's location
      try {
        const currentLocation = await LocationService.getCurrentLocation();
        if (currentLocation && donation.pickupLocation) {
          const { latitude: destLat, longitude: destLng } = donation.pickupLocation;
          
          // Prepare navigation URL based on platform
          let navigationUrl = '';
          if (Platform.OS === 'ios') {
            navigationUrl = `http://maps.apple.com/?daddr=${destLat},${destLng}&dirflg=d`;
          } else if (Platform.OS === 'android') {
            navigationUrl = `google.navigation:q=${destLat},${destLng}&mode=d`;
          } else {
            // Web fallback
            navigationUrl = `https://www.openstreetmap.org/directions?to=${destLat},${destLng}`;
          }

          Alert.alert(
            'Pickup Accepted!',
            'Would you like to open maps for navigation to the pickup location?',
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Open Maps',
                onPress: async () => {
                  try {
                    const supported = await Linking.canOpenURL(navigationUrl);
                    if (supported) {
                      await Linking.openURL(navigationUrl);
                    } else {
                      // Fallback for web or unsupported platforms
                      const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
                      await Linking.openURL(fallbackUrl);
                    }
                  } catch (linkingError) {
                    console.error('Error opening maps:', linkingError);
                    Alert.alert('Navigation Error', 'Could not open maps app');
                  }
                }
              }
            ]
          );
        } else {
          Alert.alert('Success', 'Pickup request accepted!');
        }
      } catch (navError) {
        console.error('Navigation setup error:', navError);
        Alert.alert('Success', 'Pickup request accepted! (Navigation unavailable)');
      }

    } catch (error: any) {
      console.error('Error accepting pickup:', error);
      if (error.message?.includes('already assigned')) {
        Alert.alert('Pickup Unavailable', 'This pickup has already been accepted by another volunteer.');
      } else {
        Alert.alert('Error', 'Failed to accept pickup request');
      }
    }
  };

  const handleRejectPickup = async (donationId: string) => {
    if (!user || user.role !== 'volunteer') return;
    
    try {
      await donationService.rejectPickupRequest(donationId, user.id, user.name);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting pickup:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getDashboardData = () => {
    switch (user?.role) {
      case 'ngo':
        return [
          {
            title: 'Meals Saved',
            value: analytics?.totalMealsSaved || 0,
            icon: 'restaurant' as const,
            color: '#22c55e',
          },
          {
            title: 'Total Deliveries',
            value: analytics?.totalDeliveries || 0,
            icon: 'checkmark-circle' as const,
            color: '#3b82f6',
          },
        ];
      case 'volunteer':
        return [
          {
            title: 'Deliveries Made',
            value: volunteerStats?.totalDeliveries || 0,
            icon: 'car' as const,
            color: '#f97316',
          },
          {
            title: 'Meals Delivered',
            value: volunteerStats?.totalMealsSaved || 0,
            icon: 'heart' as const,
            color: '#ef4444',
          },
        ];
      default:
        return [
          {
            title: 'Total Donations',
            value: donations.length,
            icon: 'gift' as const,
            color: '#22c55e',
          },
          {
            title: 'Pending',
            value: donations.filter(d => d.status === 'listed').length,
            icon: 'time' as const,
            color: '#f59e0b',
          },
        ];
    }
  };

  const getActionButton = () => {
    switch (user?.role) {
      case 'donor':
        return (
          <Button
            title="Add New Donation"
            onPress={() => router.push('/(tabs)/add')}
            size="large"
            style={styles.actionButton}
          />
        );
      case 'ngo':
        return (
          <Button
            title="Browse Donations"
            onPress={() => router.push('/(tabs)/map')}
            size="large"
            style={styles.actionButton}
          />
        );
      case 'volunteer':
        return (
          <Button
            title="Find Pickups"
            onPress={() => router.push('/(tabs)/map')}
            size="large"
            style={styles.actionButton}
          />
        );
      default:
        return null;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userRole}>{user.role.toUpperCase()}</Text>
            </View>
            <TouchableOpacity style={styles.profileButton}>
              <Ionicons name="person-circle" size={40} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            {getDashboardData().map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <StatCard
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                  color={stat.color}
                />
              </View>
            ))}
          </View>

          {/* Action Button */}
          {getActionButton()}

          {/* Recent Activity */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {user.role === 'donor' ? 'Your Donations' : 
                 user.role === 'ngo' ? 'Available & Claimed' : 
                 'Available Pickups'}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/home')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            {donations.length > 0 ? (
              <FlatList
                data={donations.slice(0, 3)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <FoodCard
                    donation={item}
                    onPress={() => handleDonationPress(item)}
                    viewerRole={user.role}
                    viewerUserId={user.id}
                    actionLabel={
                      user.role === 'ngo' && item.status === 'listed' ? 'Claim' :
                      user.role === 'volunteer' && item.status === 'claimed' && !item.assignedVolunteer ? 'Accept' :
                      undefined
                    }
                    onActionPress={
                      user.role === 'ngo' && item.status === 'listed' ? 
                        () => handleClaimDonation(item.id) :
                      user.role === 'volunteer' && item.status === 'claimed' && !item.assignedVolunteer ? 
                        () => handleAcceptPickup(item.id) :
                        undefined
                    }
                    secondaryActionLabel={
                      user.role === 'volunteer' && item.status === 'claimed' && !item.assignedVolunteer ? 'Reject' : undefined
                    }
                    onSecondaryActionPress={
                      user.role === 'volunteer' && item.status === 'claimed' && !item.assignedVolunteer ? 
                        () => handleRejectPickup(item.id) : undefined
                    }
                  />
                )}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="fast-food-outline" size={64} color="#9ca3af" />
                <Text style={styles.emptyStateText}>
                  {user.role === 'donor' ? 'No donations yet' :
                   user.role === 'ngo' ? 'No donations available' :
                   'No pickups available'}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {user.role === 'donor' ? 'Start by adding your first food donation' :
                   user.role === 'ngo' ? 'Check back later for new donations' :
                   'Check back later for pickup opportunities'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
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
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  profileButton: {
    opacity: 0.9,
  },
  content: {
    padding: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  actionButton: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
});
