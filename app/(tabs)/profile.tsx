import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HamburgerMenu } from '../../components/ui/HamburgerMenu';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsService, donationService } from '../../services/firebaseService';
import { NGOAnalytics, VolunteerStats } from '../../types';

const { width, height } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [analytics, setAnalytics] = useState<NGOAnalytics | null>(null);
  const [volunteerStats, setVolunteerStats] = useState<VolunteerStats | null>(null);
  const [donorStats, setDonorStats] = useState<{ totalDonations: number; activeDonations: number; completedDonations: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<VolunteerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const headerHeightAnim = useRef(new Animated.Value(0)).current;
  const profileScaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    loadUserData();
    initializeAnimations();
  }, [user]);

  const initializeAnimations = () => {
    // Main entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
      Animated.timing(headerHeightAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(profileScaleAnim, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        easing: Easing.out(Easing.back(1.3)),
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous floating animation
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatingAnimation.start();

    // Continuous rotation for decorative elements
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotateAnimation.start();

    return () => {
      floatingAnimation.stop();
      rotateAnimation.stop();
    };
  };

  const loadUserData = async () => {
    if (!user) return;

    try {
      if (user.role === 'ngo') {
        const ngoAnalytics = await analyticsService.getNGOAnalytics(user.id);
        setAnalytics(ngoAnalytics || {
          id: user.id,
          ngoId: user.id,
          totalMealsSaved: 0,
          totalDeliveries: 0,
          totalDonorsHelped: 0,
          monthlyStats: [],
          lastUpdated: new Date(),
        });
      } else if (user.role === 'volunteer') {
        // Load volunteer stats if they exist
        const stats = await analyticsService.getVolunteerStats(user.id);
        setVolunteerStats(stats || {
          id: user.id,
          volunteerId: user.id,
          totalDeliveries: 0,
          totalMilesDriven: 0,
          totalMealsSaved: 0,
          rating: 5.0,
          badges: [],
          lastDelivery: undefined,
        });
        
        // Load leaderboard for volunteers
        const volunteerLeaderboard = await analyticsService.getVolunteerLeaderboard();
        setLeaderboard(volunteerLeaderboard);
      } else if (user.role === 'donor') {
        // Load donor statistics
        const userDonations = await donationService.getDonationsByUser(user.id);
        setDonorStats({
          totalDonations: userDonations.length,
          activeDonations: userDonations.filter(d => d.status === 'listed' || d.status === 'claimed').length,
          completedDonations: userDonations.filter(d => d.status === 'delivered').length,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    try {
      setIsSigningOut(true);
      await signOut();
      // AuthContext onAuthStateChanged will navigate to /auth/welcome
    } catch (error) {
      console.error('Sign out error:', error);
      // Best-effort fallback navigation
      try { router.replace('/auth/welcome'); } catch {}
    } finally {
      setIsSigningOut(false);
    }
  };

  const getRoleColor = (): [string, string] => {
    // Consistent green theme for all roles
    return ['#22c55e', '#16a34a'];
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'donor':
        return 'storefront';
      case 'ngo':
        return 'heart';
      case 'volunteer':
        return 'car';
      default:
        return 'person';
    }
  };

  const getStatsData = () => {
    if (user?.role === 'ngo' && analytics) {
      return [
        {
          title: 'Meals Saved',
          value: analytics.totalMealsSaved,
          icon: 'restaurant' as const,
          color: '#22c55e',
        },
        {
          title: 'Deliveries',
          value: analytics.totalDeliveries,
          icon: 'checkmark-circle' as const,
          color: '#16a34a',
        },
        {
          title: 'Donors Helped',
          value: analytics.totalDonorsHelped,
          icon: 'people' as const,
          color: '#059669',
        },
      ];
    }

    if (user?.role === 'volunteer' && volunteerStats) {
      return [
        {
          title: 'Deliveries',
          value: volunteerStats.totalDeliveries,
          icon: 'car' as const,
          color: '#22c55e',
        },
        {
          title: 'Meals Delivered',
          value: volunteerStats.totalMealsSaved,
          icon: 'heart' as const,
          color: '#16a34a',
        },
        {
          title: 'Rating',
          value: volunteerStats.rating.toFixed(1),
          icon: 'star' as const,
          color: '#059669',
        },
      ];
    }

    if (user?.role === 'donor' && donorStats) {
      return [
        {
          title: 'Total Donations',
          value: donorStats.totalDonations,
          icon: 'gift' as const,
          color: '#22c55e',
        },
        {
          title: 'Active',
          value: donorStats.activeDonations,
          icon: 'time' as const,
          color: '#16a34a',
        },
        {
          title: 'Completed',
          value: donorStats.completedDonations,
          icon: 'checkmark-circle' as const,
          color: '#059669',
        },
      ];
    }

    return [];
  };

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Hamburger Menu */}
      <HamburgerMenu currentRoute="/(tabs)/profile" />
      
      {/* Animated Background Elements */}
      <View style={styles.backgroundContainer}>
        <Animated.View style={[styles.floatingElement1, {
          transform: [{
            translateY: floatingAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -15]
            })
          }, {
            rotate: rotateAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg']
            })
          }]
        }]} />
        <Animated.View style={[styles.floatingElement2, {
          transform: [{
            translateX: floatingAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 10]
            })
          }]
        }]} />
        <Animated.View style={[styles.floatingElement3, {
          transform: [{
            scale: floatingAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.2]
            })
          }]
        }]} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#22c55e"
            colors={['#22c55e']}
          />
        }
      >
        {/* Enhanced Profile Header */}
        <View style={styles.headerContainer}>
          <LinearGradient 
            colors={['#ffffff', '#f9fafb']} 
            style={styles.headerBackground}
          >
            <Animated.View style={[styles.headerContent, {
              opacity: fadeAnim,
              transform: [{ scale: profileScaleAnim }]
            }]}>
              <View style={styles.avatarSection}>
                <View style={styles.avatarWrapper}>
                  <LinearGradient
                    colors={['#22c55e', '#16a34a']}
                    style={styles.avatarGradient}
                  >
                    <TouchableOpacity 
                      style={styles.avatar} 
                      onPress={() => router.push('/edit-profile')}
                    >
                      {user.profileImageBase64 ? (
                        <Image
                          source={{ uri: `data:image/jpeg;base64,${user.profileImageBase64}` }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarText}>
                            {user.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </LinearGradient>
                  {user.isVerified && (
                    <Animated.View style={[styles.verifiedBadge, {
                      transform: [{
                        scale: floatingAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.1]
                        })
                      }]
                    }]}>
                      <LinearGradient
                        colors={['#22c55e', '#16a34a']}
                        style={styles.verifiedGradient}
                      >
                        <Ionicons name="checkmark" size={16} color="#ffffff" />
                      </LinearGradient>
                    </Animated.View>
                  )}
                </View>
                
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <View style={styles.roleContainer}>
                    <LinearGradient
                      colors={['#22c55e', '#16a34a']}
                      style={styles.roleBadge}
                    >
                      <Ionicons name={getRoleIcon() as any} size={14} color="#ffffff" />
                      <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                    </LinearGradient>
                  </View>
                  {user.organizationName && (
                    <Text style={styles.organizationName}>{user.organizationName}</Text>
                  )}
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
              </View>
            </Animated.View>
          </LinearGradient>
        </View>

        <Animated.View style={[styles.content, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}>
          {/* Enhanced Statistics Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="analytics" size={24} color="#22c55e" />
              <Text style={styles.sectionTitle}>Your Impact</Text>
            </View>
            <View style={styles.statsContainer}>
              <LinearGradient
                colors={['#ffffff', '#f9fafb']}
                style={styles.statsGradient}
              >
                <View style={styles.statsGrid}>
                  {getStatsData().map((stat, index) => (
                    <Animated.View 
                      key={index} 
                      style={[styles.statItem, {
                        transform: [{
                          translateY: slideAnim.interpolate({
                            inputRange: [0, 50],
                            outputRange: [0, 25 + (index * 10)]
                          })
                        }]
                      }]}
                    >
                      <LinearGradient
                        colors={['#ffffff', '#f8fafc']}
                        style={styles.statCard}
                      >
                        <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}15` }]}>
                          <Ionicons name={stat.icon} size={24} color={stat.color} />
                        </View>
                        <Text style={styles.statValue}>{stat.value}</Text>
                        <Text style={styles.statLabel}>{stat.title}</Text>
                      </LinearGradient>
                    </Animated.View>
                  ))}
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Enhanced Volunteer Leaderboard */}
          {user.role === 'volunteer' && leaderboard.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trophy" size={24} color="#22c55e" />
                <Text style={styles.sectionTitle}>Volunteer Leaderboard</Text>
              </View>
              <View style={styles.leaderboard}>
                <LinearGradient
                  colors={['#ffffff', '#f9fafb']}
                  style={styles.leaderboardGradient}
                >
                  {leaderboard.slice(0, 5).map((volunteer, index) => (
                    <Animated.View 
                      key={volunteer.id} 
                      style={[styles.leaderboardItem, {
                        transform: [{
                          translateX: slideAnim.interpolate({
                            inputRange: [0, 50],
                            outputRange: [0, -20 + (index * 5)]
                          })
                        }]
                      }]}
                    >
                      <LinearGradient
                        colors={index === 0 ? ['#dcfce7', '#bbf7d0'] : ['#f9fafb', '#ffffff']}
                        style={styles.leaderboardRank}
                      >
                        <Text style={[styles.rankNumber, index === 0 && styles.goldRank]}>
                          {index + 1}
                        </Text>
                      </LinearGradient>
                      <View style={styles.leaderboardInfo}>
                        <Text style={styles.leaderboardName}>
                          {volunteer.id === user.id ? 'You' : `Volunteer ${index + 1}`}
                        </Text>
                        <Text style={styles.leaderboardStats}>
                          {volunteer.totalMealsSaved} meals • {volunteer.totalDeliveries} deliveries
                        </Text>
                      </View>
                      <View style={styles.leaderboardBadges}>
                        {volunteer.badges.map((badge, badgeIndex) => (
                          <View key={badgeIndex} style={styles.badge}>
                            <Text style={styles.badgeText}>{badge}</Text>
                          </View>
                        ))}
                      </View>
                    </Animated.View>
                  ))}
                </LinearGradient>
              </View>
            </View>
          )}

          {/* Enhanced Account Actions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings" size={24} color="#22c55e" />
              <Text style={styles.sectionTitle}>Account</Text>
            </View>
            
            <View style={styles.actionGrid}>
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => router.push('/edit-profile')}
              >
                <LinearGradient
                  colors={['#ffffff', '#f9fafb']}
                  style={styles.actionItemGradient}
                >
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="person-outline" size={24} color="#22c55e" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Edit Profile</Text>
                    <Text style={styles.actionSubtitle}>Update your information</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem}>
                <LinearGradient
                  colors={['#ffffff', '#f9fafb']}
                  style={styles.actionItemGradient}
                >
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="notifications-outline" size={24} color="#22c55e" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Notification Settings</Text>
                    <Text style={styles.actionSubtitle}>Manage your notifications</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem}>
                <LinearGradient
                  colors={['#ffffff', '#f9fafb']}
                  style={styles.actionItemGradient}
                >
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="help-circle-outline" size={24} color="#22c55e" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Help & Support</Text>
                    <Text style={styles.actionSubtitle}>Get help with the app</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem}>
                <LinearGradient
                  colors={['#ffffff', '#f9fafb']}
                  style={styles.actionItemGradient}
                >
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="information-circle-outline" size={24} color="#22c55e" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>About Food Rescue</Text>
                    <Text style={styles.actionSubtitle}>Learn more about our mission</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Enhanced Sign Out */}
          <View style={styles.signOutContainer}>
            <TouchableOpacity 
              style={[styles.signOutButton, isSigningOut && { opacity: 0.6 }]}
              onPress={handleSignOut}
              disabled={isSigningOut}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <LinearGradient
                colors={['#ffffff', '#f9fafb']}
                style={styles.signOutGradient}
              >
                <Ionicons name="log-out-outline" size={24} color="#dc2626" />
                <Text style={styles.signOutText}>{isSigningOut ? 'Signing out…' : 'Sign Out'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
  },
  floatingElement1: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  floatingElement2: {
    position: 'absolute',
    top: 300,
    left: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  floatingElement3: {
    position: 'absolute',
    bottom: 200,
    right: 40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(34, 197, 94, 0.03)',
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerBackground: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 94,
    height: 94,
    borderRadius: 47,
  },
  avatarPlaceholder: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  verifiedGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  roleContainer: {
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  organizationName: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 12,
  },
  statsContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsGradient: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '30%',
  },
  statCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  leaderboard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  leaderboardGradient: {
    padding: 20,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  leaderboardRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  goldRank: {
    color: '#22c55e',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  leaderboardStats: {
    fontSize: 14,
    color: '#6b7280',
  },
  leaderboardBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '500',
  },
  actionGrid: {
    gap: 12,
  },
  actionItem: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    marginBottom: 12,
  },
  actionItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  signOutContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  signOutButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  signOutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginLeft: 12,
  },
});
