import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { FoodCard } from '../../components/ui/FoodCard';
import { HamburgerMenu } from '../../components/ui/HamburgerMenu';
import { StatCard } from '../../components/ui/StatCard';
import VolunteerDashboard from '../../components/ui/VolunteerDashboard';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsService, donationService } from '../../services/firebaseService';
import { LocationService } from '../../services/locationService';
import { FoodDonation, NGOAnalytics, VolunteerStats } from '../../types';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, isLoading } = useAuth();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [analytics, setAnalytics] = useState<NGOAnalytics | null>(null);
  const [volunteerStats, setVolunteerStats] = useState<VolunteerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(-50)).current;
  const statsAnim = useRef(new Animated.Value(30)).current;
  const contentAnim = useRef(new Animated.Value(40)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const profilePulseAnim = useRef(new Animated.Value(1)).current;
  const profileRotateAnim = useRef(new Animated.Value(0)).current;
  
  // Background floating elements
  const circles = useRef(
    Array.from({ length: 6 }, (_, i) => ({
      anim: new Animated.ValueXY({
        x: Math.random() * width,
        y: Math.random() * height,
      }),
      size: Math.random() * 80 + 40,
      opacity: Math.random() * 0.04 + 0.01,
      color: ['#22c55e', '#10b981', '#16a34a', '#059669', '#047857', '#065f46'][i],
    }))
  ).current;

  // One-time animations setup
  useEffect(() => {
    // Entrance animations
    const entrance = Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(headerAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.stagger(200, [
        Animated.timing(statsAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(contentAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]);
    entrance.start();

    // Background animations
    const bgLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundAnim, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundAnim, {
          toValue: 0,
          duration: 5000,
          useNativeDriver: true,
        }),
      ])
    );
    bgLoop.start();

    // Shimmer effect
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 3500,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerLoop.start();

    // Floating circles animation
    circles.forEach((circle, index) => {
      const animateCircle = () => {
        Animated.timing(circle.anim, {
          toValue: {
            x: Math.random() * width,
            y: Math.random() * height,
          },
          duration: 10000 + Math.random() * 5000,
          useNativeDriver: false,
        }).start(() => animateCircle());
      };
      const timer = setTimeout(() => animateCircle(), index * 800);
      // Store timer on the circle object for cleanup
      // @ts-expect-error: augmenting for cleanup tracking
      circle._timer = timer;
    });

    // Profile button animations
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(profilePulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(profilePulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    const rotateLoop = Animated.loop(
      Animated.timing(profileRotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    );
    rotateLoop.start();

    return () => {
      try { entrance.stop(); } catch {}
      try { bgLoop.stop(); } catch {}
      try { shimmerLoop.stop(); } catch {}
      try { pulseLoop.stop(); } catch {}
      try { rotateLoop.stop(); } catch {}
      circles.forEach((circle: any) => {
        if (circle?._timer) clearTimeout(circle._timer);
      });
    };
  }, []);

  // Data load + subscriptions per role
  useEffect(() => {
    loadData();
    if (!user) return;
    let unsubscribe: (() => void) | null = null;
    if (user.role === 'donor') {
      unsubscribe = donationService.subscribeToUserDonations(user.id, setDonations);
    } else if (user.role === 'ngo') {
      const unsubAvail = donationService.subscribeToAvailableDonations((availableItems) => {
        setDonations((prev) => {
          const claimed = prev.filter(d => d.claimedBy === user.id);
          const filteredAvailable = availableItems.filter(d => !(d.rejectedByNGOs || []).includes(user.id));
          const map = new Map<string, FoodDonation>();
          [...claimed, ...filteredAvailable].forEach(d => map.set(d.id, d));
          return Array.from(map.values());
        });
      });
      const unsubClaimed = donationService.subscribeToClaimedDonations(user.id, (claimedItems) => {
        setDonations((prev) => {
          const available = prev.filter(d => d.status === 'listed');
          const map = new Map<string, FoodDonation>();
          [...claimedItems, ...available].forEach(d => map.set(d.id, d));
          return Array.from(map.values());
        });
      });
      unsubscribe = () => { unsubAvail(); unsubClaimed(); };
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [user]);

  // If user is a volunteer, show the dedicated volunteer dashboard
  // Note: placed after all hooks to maintain consistent hook order across renders
  if (user?.role === 'volunteer') {
    return <VolunteerDashboard />;
  }

  async function loadData() {
    if (!user) return;

    try {
      if (user.role === 'donor') {
  const userDonations = await donationService.getDonationsByUser(user.id);
  setDonations(userDonations);
      } else if (user.role === 'ngo') {
  const availableDonations = await donationService.getAvailableDonations();
  const claimedDonations = (await donationService.getClaimedDonations(user.id)).filter(d => d.status !== 'delivered');
  // Filter out donations this NGO has rejected
  const filteredAvailable = availableDonations.filter(d => !(d.rejectedByNGOs || []).includes(user.id));
  setDonations([...claimedDonations, ...filteredAvailable]);
        
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
  }

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
      // Refresh analytics so Meals Saved updates immediately
      try {
        const ngoAnalytics = await analyticsService.getNGOAnalytics(user.id);
        setAnalytics(ngoAnalytics);
      } catch {}
    } catch (error) {
      console.error('Error claiming donation:', error);
    }
  };

  const handleRejectDonationAsNGO = async (donationId: string) => {
    if (!user || user.role !== 'ngo') return;
    try {
      await donationService.rejectDonationForNGO(donationId, user.id);
      loadData();
    } catch (error) {
      console.error('Error rejecting donation:', error);
    }
  };

  const handleMarkDelivered = async (donationId: string) => {
    try {
      await donationService.markDonationDelivered(donationId);
      loadData();
    } catch (error) {
      console.error('Error marking delivered:', error);
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
          // Optional: Claimed/Assigned count card could be added here
        ];
      case 'volunteer':
        return [
          {
            title: 'Deliveries',
            value: volunteerStats?.totalDeliveries || 0,
            icon: 'car' as const,
            color: '#f97316',
          },
          {
            title: 'Meals Saved',
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
            // Count only this donor's still-listed items
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
            onPress={() => router.push('/add')}
            size="large"
            style={styles.actionButton}
          />
        );
      case 'ngo':
        return (
          <Button
            title="Browse Donations"
            onPress={() => router.push('/map')}
            size="large"
            style={styles.actionButton}
          />
        );
      case 'volunteer':
        return (
          <Button
            title="Find Pickups"
            onPress={() => router.push('/map')}
            size="large"
            style={styles.actionButton}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      <View style={styles.container}>
        {/* Background Animation Elements */}
        <Animated.View 
          style={[
            styles.backgroundGradient,
            {
              opacity: backgroundAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.02, 0.06]
              })
            }
          ]}
        />
        
        {/* Floating Background Circles */}
        {circles.map((circle, index) => (
          <Animated.View 
            key={index}
            style={[
              styles.floatingCircle,
              {
                width: circle.size,
                height: circle.size,
                backgroundColor: circle.color,
                opacity: circle.opacity,
                transform: [
                  { translateX: circle.anim.x },
                  { translateY: circle.anim.y }
                ]
              }
            ]}
          />
        ))}

        {/* Shimmer Effect */}
        <Animated.View 
          style={[
            styles.shimmerOverlay,
            {
              opacity: shimmerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.03]
              })
            }
          ]}
        />

        <SafeAreaView style={styles.safeArea}>
          {/* Hamburger Menu */}
          <HamburgerMenu currentRoute="/(tabs)/home" />
          
          <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              {/* Header */}
              <Animated.View 
                style={[
                  styles.header,
                  { transform: [{ translateY: headerAnim }] }
                ]}
              >
                <View style={styles.headerContent}>
                  <View>
                    <Text style={styles.greeting}>{getGreeting()},</Text>
                    <Text style={styles.userName}>{user.name}</Text>
                    <View style={styles.roleBadge}>
                      <Text style={styles.userRole}>{user.role.toUpperCase()}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.profileButton}
                    onPress={() => router.push('/profile')}
                    activeOpacity={0.8}
                  >
                    <Animated.View 
                      style={[
                        styles.profileCircle,
                        {
                          transform: [
                            { scale: profilePulseAnim },
                            {
                              rotate: profileRotateAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg'],
                              }),
                            },
                          ],
                        }
                      ]}
                    >
                      <View style={styles.profileInnerCircle}>
                        <Ionicons name="person" size={20} color="#22c55e" />
                      </View>
                    </Animated.View>
                    <View style={styles.profileGlow} />
                    <View style={styles.profileRing} />
                  </TouchableOpacity>
                </View>
              </Animated.View>

              <View style={styles.content}>
                {/* Stats Cards */}
                <Animated.View 
                  style={[
                    styles.statsContainer,
                    { transform: [{ translateY: statsAnim }] }
                  ]}
                >
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
                </Animated.View>

                {/* Action Button */}
                <Animated.View 
                  style={[
                    styles.actionButtonContainer,
                    { transform: [{ translateY: contentAnim }] }
                  ]}
                >
                  {getActionButton()}
                </Animated.View>

                {/* Recent Activity */}
                <Animated.View 
                  style={[
                    styles.section,
                    { transform: [{ translateY: contentAnim }] }
                  ]}
                >
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      {user.role === 'donor' ? 'Your Donations' : 
                       user.role === 'ngo' ? 'Available & Claimed' : 
                       'Available Pickups'}
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/all')}>
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
                            user.role === 'ngo' && item.status === 'listed' ? 'Accept' :
                            user.role === 'ngo' && (item.status === 'assigned' || item.status === 'picked_up') && item.claimedBy === user.id ? 'Mark Delivered' :
                            user.role === 'volunteer' && item.status === 'claimed' && !item.assignedVolunteer ? 'Accept' :
                            undefined
                          }
                          onActionPress={
                            user.role === 'ngo' && item.status === 'listed' ? 
                              () => handleClaimDonation(item.id) :
                            user.role === 'ngo' && (item.status === 'assigned' || item.status === 'picked_up') && item.claimedBy === user.id ?
                              () => handleMarkDelivered(item.id) :
                            user.role === 'volunteer' && item.status === 'claimed' && !item.assignedVolunteer ? 
                              () => handleAcceptPickup(item.id) :
                              undefined
                          }
                          secondaryActionLabel={
                            user.role === 'ngo' && item.status === 'listed' ? 'Reject' :
                            user.role === 'volunteer' && item.status === 'claimed' && !item.assignedVolunteer ? 'Reject' : undefined
                          }
                          onSecondaryActionPress={
                            user.role === 'ngo' && item.status === 'listed' ? 
                              () => handleRejectDonationAsNGO(item.id) :
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
                </Animated.View>
              </View>
            </ScrollView>
          </Animated.View>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  
  // Background animation elements
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.01)',
    zIndex: -1,
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 1000,
    zIndex: -1,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.005)',
    zIndex: -1,
  },
  
  safeArea: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '400',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  userRole: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
    letterSpacing: 1,
  },
  profileButton: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  profileInnerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    zIndex: -1,
  },
  profileRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    zIndex: -1,
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
  actionButtonContainer: {
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: '#22c55e',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#22c55e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    fontWeight: '700',
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 8,
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
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});
