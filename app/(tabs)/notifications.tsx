import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HamburgerMenu } from '../../components/ui/HamburgerMenu';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/firebaseService';
import { AppNotification } from '../../types';

const { width } = Dimensions.get('window');

interface NotificationItemProps {
  notification: AppNotification;
  onPress: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onPress }) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const animationDelay = Math.random() * 300; // Staggered animation
    
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ]).start();
    }, animationDelay);
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };
  const getIcon = (type: string) => {
    switch (type) {
      case 'donation_listed':
        return 'restaurant';
      case 'donation_claimed':
        return 'checkmark-circle';
      case 'pickup_assigned':
        return 'car';
      case 'delivery_completed':
        return 'gift';
      case 'urgent_request':
        return 'warning';
      default:
        return 'notifications';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'donation_listed':
        return '#22c55e';
      case 'donation_claimed':
        return '#3b82f6';
      case 'pickup_assigned':
        return '#f97316';
      case 'delivery_completed':
        return '#8b5cf6';
      case 'urgent_request':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <Animated.View style={{
      transform: [
        { translateY: slideAnim },
        { scale: scaleAnim }
      ],
      opacity: fadeAnim,
    }}>
      <TouchableOpacity
        style={[styles.notificationItem, !notification.isRead && styles.unreadNotification]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={!notification.isRead ? ['#ffffff', '#f0fdf4'] : ['#ffffff', '#ffffff']}
          style={styles.notificationGradient}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${getIconColor(notification.type)}15` }]}>
            <View style={[styles.iconInner, { backgroundColor: `${getIconColor(notification.type)}25` }]}>
              <Ionicons
                name={getIcon(notification.type) as any}
                size={20}
                color={getIconColor(notification.type)}
              />
            </View>
          </View>
          
          <View style={styles.notificationContent}>
            <Text style={[styles.notificationTitle, !notification.isRead && styles.unreadTitle]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message}
            </Text>
            <Text style={styles.notificationTime}>
              {formatTime(notification.createdAt)}
            </Text>
          </View>
          
          {!notification.isRead && (
            <View style={styles.unreadIndicator}>
              <View style={styles.unreadDot} />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const headerScaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Initialize entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(headerScaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.1)),
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

    return () => floatingAnimation.stop();
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const userNotifications = await notificationService.getUserNotifications(user.id);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate to related content if applicable
    if (notification.relatedDonationId) {
      console.log('Navigate to donation:', notification.relatedDonationId);
      // Here you would navigate to the donation details screen
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifications.map(n => notificationService.markAsRead(n.id))
      );
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Hamburger Menu */}
      <HamburgerMenu currentRoute="/(tabs)/notifications" />
      
      {/* Animated Background Elements */}
      <View style={styles.backgroundContainer}>
        <Animated.View style={[styles.floatingAccent1, {
          transform: [{
            translateY: floatingAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -10]
            })
          }]
        }]} />
        <Animated.View style={[styles.floatingAccent2, {
          transform: [{
            translateX: floatingAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 8]
            })
          }]
        }]} />
        <Animated.View style={[styles.floatingAccent3, {
          transform: [{
            scale: floatingAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.1]
            })
          }]
        }]} />
      </View>

      <Animated.View style={[styles.header, {
        opacity: fadeAnim,
        transform: [
          { translateY: slideAnim },
          { scale: headerScaleAnim }
        ]
      }]}>
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>
                    {unreadCount} unread
                  </Text>
                </View>
              )}
            </View>
            {unreadCount > 0 && (
              <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
                <LinearGradient
                  colors={['#22c55e', '#16a34a']}
                  style={styles.markAllGradient}
                >
                  <Ionicons name="checkmark-done" size={16} color="#ffffff" />
                  <Text style={styles.markAllText}>Mark all read</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </Animated.View>

      {notifications.length > 0 ? (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationItem
                notification={item}
                onPress={() => handleNotificationPress(item)}
              />
            )}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#22c55e"
                colors={['#22c55e']}
              />
            }
            contentContainerStyle={styles.listContainer}
          />
        </Animated.View>
      ) : (
        <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
          <View style={styles.emptyBackground}>
            <Animated.View style={[styles.emptyIconContainer, {
              transform: [{
                scale: floatingAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.05]
                })
              }]
            }]}>
              <LinearGradient
                colors={['#f0fdf4', '#dcfce7']}
                style={styles.emptyIconGradient}
              >
                <Ionicons name="notifications-outline" size={48} color="#22c55e" />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.emptyStateTitle}>No notifications yet</Text>
            <Text style={styles.emptyStateText}>
              You'll receive notifications about donations, pickups, and deliveries here.
            </Text>
          </View>
        </Animated.View>
      )}
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
    zIndex: 0,
  },
  floatingAccent1: {
    position: 'absolute',
    top: 80,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  floatingAccent2: {
    position: 'absolute',
    top: 150,
    left: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  floatingAccent3: {
    position: 'absolute',
    bottom: 100,
    right: 40,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  header: {
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  unreadCount: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  markAllButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  markAllText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 6,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100,
  },
  notificationItem: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  unreadNotification: {
    shadowOpacity: 0.12,
    elevation: 8,
    shadowColor: '#22c55e',
  },
  notificationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    lineHeight: 22,
  },
  unreadTitle: {
    color: '#1f2937',
    fontWeight: '700',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  unreadIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyBackground: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyIconContainer: {
    marginBottom: 24,
    borderRadius: 40,
    overflow: 'hidden',
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 40,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
});
