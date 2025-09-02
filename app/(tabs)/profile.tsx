import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { analyticsService, donationService } from '../../services/firebaseService';
import { NGOAnalytics, VolunteerStats, FoodDonation } from '../../types';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [analytics, setAnalytics] = useState<NGOAnalytics | null>(null);
  const [volunteerStats, setVolunteerStats] = useState<VolunteerStats | null>(null);
  const [donorStats, setDonorStats] = useState<{ totalDonations: number; activeDonations: number; completedDonations: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<VolunteerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      if (user.role === 'ngo') {
        const ngoAnalytics = await analyticsService.getNGOAnalytics(user.id);
        setAnalytics(ngoAnalytics);
      } else if (user.role === 'volunteer') {
        // Load volunteer stats if they exist
        // const stats = await analyticsService.getVolunteerStats(user.id);
        // setVolunteerStats(stats);
        
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

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        },
      ]
    );
  };

  const getRoleColor = (): [string, string] => {
    switch (user?.role) {
      case 'donor':
        return ['#22c55e', '#16a34a'];
      case 'ngo':
        return ['#f97316', '#ea580c'];
      case 'volunteer':
        return ['#3b82f6', '#2563eb'];
      default:
        return ['#6b7280', '#4b5563'];
    }
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
          color: '#3b82f6',
        },
        {
          title: 'Donors Helped',
          value: analytics.totalDonorsHelped,
          icon: 'people' as const,
          color: '#f97316',
        },
      ];
    }

    if (user?.role === 'volunteer' && volunteerStats) {
      return [
        {
          title: 'Deliveries',
          value: volunteerStats.totalDeliveries,
          icon: 'car' as const,
          color: '#f97316',
        },
        {
          title: 'Meals Delivered',
          value: volunteerStats.totalMealsSaved,
          icon: 'heart' as const,
          color: '#ef4444',
        },
        {
          title: 'Rating',
          value: volunteerStats.rating.toFixed(1),
          icon: 'star' as const,
          color: '#fbbf24',
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
          color: '#f97316',
        },
        {
          title: 'Completed',
          value: donorStats.completedDonations,
          icon: 'checkmark-circle' as const,
          color: '#3b82f6',
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Header */}
        <LinearGradient colors={getRoleColor()} style={styles.header}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity style={styles.avatar} onPress={() => router.push('/edit-profile')}>
                {user.profileImageBase64 ? (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${user.profileImageBase64}` }}
                    style={{ width: '100%', height: '100%', borderRadius: 40 }}
                  />
                ) : (
                  <Ionicons name={getRoleIcon() as any} size={40} color="#ffffff" />
                )}
              </TouchableOpacity>
              {user.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                </View>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userRole}>{user.role.toUpperCase()}</Text>
              {user.organizationName && (
                <Text style={styles.organizationName}>{user.organizationName}</Text>
              )}
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Impact</Text>
            <View style={styles.statsGrid}>
              {getStatsData().map((stat, index) => (
                <View key={index} style={styles.statItem}>
                  <StatCard
                    title={stat.title}
                    value={stat.value}
                    icon={stat.icon}
                    color={stat.color}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Volunteer Leaderboard */}
          {user.role === 'volunteer' && leaderboard.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Volunteer Leaderboard</Text>
              <View style={styles.leaderboard}>
                {leaderboard.slice(0, 5).map((volunteer, index) => (
                  <View key={volunteer.id} style={styles.leaderboardItem}>
                    <View style={styles.leaderboardRank}>
                      <Text style={styles.rankNumber}>{index + 1}</Text>
                    </View>
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
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Account Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => router.push('/edit-profile')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="person-outline" size={24} color="#6b7280" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Edit Profile</Text>
                <Text style={styles.actionSubtitle}>Update your information</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon}>
                <Ionicons name="notifications-outline" size={24} color="#6b7280" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Notification Settings</Text>
                <Text style={styles.actionSubtitle}>Manage your notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon}>
                <Ionicons name="help-circle-outline" size={24} color="#6b7280" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Help & Support</Text>
                <Text style={styles.actionSubtitle}>Get help with the app</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon}>
                <Ionicons name="information-circle-outline" size={24} color="#6b7280" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>About Food Rescue</Text>
                <Text style={styles.actionSubtitle}>Learn more about our mission</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Sign Out */}
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="outline"
            size="large"
            style={styles.signOutButton}
            textStyle={styles.signOutText}
          />
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
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileInfo: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 4,
  },
  organizationName: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '30%',
  },
  leaderboard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  leaderboardRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  leaderboardStats: {
    fontSize: 12,
    color: '#6b7280',
  },
  leaderboardBadges: {
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  signOutButton: {
    marginTop: 16,
    borderColor: '#ef4444',
  },
  signOutText: {
    color: '#ef4444',
  },
});
