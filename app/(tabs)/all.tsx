import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FoodCard } from '../../components/ui/FoodCard';
import { HamburgerMenu } from '../../components/ui/HamburgerMenu';
import { useAuth } from '../../contexts/AuthContext';
import { donationService } from '../../services/firebaseService';
import { FoodDonation } from '../../types';

export default function AllScreen() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    load();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();
  }, [user]);

  const load = async () => {
    if (!user) return;
    try {
      if (user.role === 'donor') {
        const list = await donationService.getDonationsByUser(user.id);
        setDonations(list);
      } else if (user.role === 'ngo') {
        // Combine available + claimed
        const [available, claimed] = await Promise.all([
          donationService.getAvailableDonations(),
          donationService.getClaimedDonations(user.id),
        ]);
        const map = new Map<string, FoodDonation>();
        [...claimed, ...available].forEach(d => map.set(d.id, d));
        setDonations(Array.from(map.values()));
      } else if (user.role === 'volunteer') {
        const list = await donationService.getPendingPickupRequests(user.id);
        setDonations(list);
      }
    } catch (e) {
      console.error('Load all error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <HamburgerMenu currentRoute="/all" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {user.role === 'donor' ? 'All Donations' : user.role === 'ngo' ? 'All Available & Claimed' : 'All Pickup Requests'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#22c55e" />
          </View>
        ) : donations.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="file-tray-outline" size={56} color="#9ca3af" />
            <Text style={styles.empty}>No items found</Text>
          </View>
        ) : (
          <FlatList
            data={donations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FoodCard
                donation={item}
                onPress={() => {}}
                showStatus
                viewerRole={user.role}
                viewerUserId={user.id}
              />
            )}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { marginTop: 12, color: '#6b7280', fontWeight: '600' },
});
