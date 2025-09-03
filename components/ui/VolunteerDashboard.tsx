import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FoodCard } from '@/components/ui/FoodCard';
import { NGOSelection } from '@/components/ui/NGOSelection';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsService, donationService } from '@/services/firebaseService';
import { FoodDonation } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNGOSelection, setShowNGOSelection] = useState(false);
  const [stats, setStats] = useState({
  completedPickups: 0,
    pendingRequests: 0,
  });

  useEffect(() => {
    if (user?.role === 'volunteer') {
      loadPickupRequests();
      loadVolunteerStats();
    }
  }, [user]);

  const loadVolunteerStats = async () => {
    if (!user) return;
    try {
      const vs = await analyticsService.getVolunteerStats(user.id);
      setStats(prev => ({ ...prev, completedPickups: vs?.totalDeliveries || 0 }));
    } catch (error) {
      // non-blocking
    }
  };

  const loadPickupRequests = async () => {
    if (!user) return;

    try {
      const requests = await donationService.getPendingPickupRequests(user.id);
      setDonations(requests);
      setStats(prev => ({ ...prev, pendingRequests: requests.length }));
    } catch (error) {
      console.error('Error loading pickup requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPickup = async (donation: FoodDonation) => {
    if (!user) return;

    try {
      await donationService.acceptPickupRequest(donation.id, user.id, user.name);
      
      // Navigate to the map tab with the pickup details
      router.push({
        pathname: '/(tabs)/map',
        params: {
          pickupId: donation.id,
          pickupAddress: donation.pickupLocation.address,
          latitude: donation.pickupLocation.latitude.toString(),
          longitude: donation.pickupLocation.longitude.toString(),
          donorName: donation.donorName,
          foodTitle: donation.title,
        }
      });
      
      Alert.alert(
        'Pickup Accepted!',
        `Navigation to pickup location is now available in the Map tab.`,
        [{ text: 'OK' }]
      );
      
      loadPickupRequests(); // Refresh the list
  loadVolunteerStats();
    } catch (error) {
      console.error('Error accepting pickup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept pickup request';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleRejectPickup = async (donation: FoodDonation) => {
    if (!user) return;

    try {
      await donationService.rejectPickupRequest(donation.id, user.id, user.name);
      Alert.alert('Request Declined', 'Pickup request has been declined.');
      loadPickupRequests(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting pickup:', error);
      Alert.alert('Error', 'Failed to reject pickup request');
    }
  };

  const handleNGOUpdate = async (selectedNGOs: string[]) => {
    if (!user) return;

    try {
      // Update user document in Firestore
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { selectedNGOs });
      
      Alert.alert('Success', 'NGO preferences updated successfully!');
      loadPickupRequests(); // Refresh to get new requests
    } catch (error) {
      console.error('Error updating NGO selection:', error);
      Alert.alert('Error', 'Failed to update NGO preferences');
    }
  };

  const renderPickupRequest = ({ item }: { item: FoodDonation }) => (
    <View style={styles.donationContainer}>
      <FoodCard
        donation={item}
        onPress={() => {}} // Empty onPress
        onActionPress={() => handleAcceptPickup(item)}
        actionLabel="Accept Pickup"
        onSecondaryActionPress={() => handleRejectPickup(item)}
        secondaryActionLabel="Decline"
        showStatus={true}
      />
    </View>
  );

  if (user?.role !== 'volunteer') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Access denied. Volunteer role required.</ThemedText>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading pickup requests...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Volunteer Dashboard</ThemedText>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowNGOSelection(true)}
        >
          <Ionicons name="settings-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statNumber}>{stats.completedPickups}</ThemedText>
          <ThemedText style={styles.statLabel}>Completed</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={styles.statNumber}>{donations.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Pending Requests</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={styles.statNumber}>
            {user.selectedNGOs?.length || 0}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Partner NGOs</ThemedText>
        </View>
      </View>

      {/* NGO Selection Reminder */}
      {(!user.selectedNGOs || user.selectedNGOs.length === 0) && (
        <TouchableOpacity
          style={styles.reminderCard}
          onPress={() => setShowNGOSelection(true)}
        >
          <Ionicons name="information-circle" size={24} color="#FF9500" />
          <View style={styles.reminderText}>
            <ThemedText style={styles.reminderTitle}>Select NGOs to Volunteer For</ThemedText>
            <ThemedText style={styles.reminderSubtitle}>
              Choose NGOs to receive pickup notifications
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      )}

      {/* Pickup Requests */}
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">Pickup Requests</ThemedText>
      </View>

      {donations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={64} color="#ccc" />
          <ThemedText style={styles.emptyText}>No pickup requests available</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            {user.selectedNGOs?.length === 0
              ? 'Select NGOs to start receiving pickup requests'
              : 'Check back later for new requests'}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={donations}
          renderItem={renderPickupRequest}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* NGO Selection Modal */}
      <Modal
        visible={showNGOSelection}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {user && (
          <NGOSelection
            user={user}
            onUpdate={handleNGOUpdate}
            onClose={() => setShowNGOSelection(false)}
          />
        )}
      </Modal>
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
  settingsButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  reminderText: {
    flex: 1,
    marginLeft: 12,
  },
  reminderTitle: {
    fontWeight: '600',
    color: '#333',
  },
  reminderSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  donationContainer: {
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  listContainer: {
    paddingBottom: 20,
  },
});
