import {
    addDoc,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AppNotification, DonationStatus, FoodDonation, NGOAnalytics, VolunteerStats } from '../types';

// Helpers to safely convert Firestore timestamps to JS Dates
const toJsDate = (v: any): Date | undefined => {
  if (!v) return undefined;
  try {
    if (typeof v.toDate === 'function') return v.toDate();
    if (v instanceof Date) return v as Date;
  } catch {}
  return undefined;
};

const mapDonationDoc = (docSnap: any): FoodDonation => {
  const data = docSnap.data() as any;
  const createdAt = toJsDate(data.createdAt) || new Date();
  const updatedAt = toJsDate(data.updatedAt) || createdAt;
  const deadline = toJsDate(data.deadline) || toJsDate(data.expiresAt) || new Date(Date.now() + 6 * 60 * 60 * 1000);
  return {
    id: docSnap.id,
    ...data,
    createdAt,
    updatedAt,
    deadline,
  } as FoodDonation;
};

// Donation Services
export const donationService = {
  // Create a new food donation
  async createDonation(donationData: Omit<FoodDonation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'donations'), {
        ...donationData,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
  deadline: Timestamp.fromDate(donationData.deadline),
  expiresAt: null,
      });

      // Notify donor about listing
      try {
        await notificationService.createNotification({
          userId: donationData.donorId,
          title: 'Donation Listed',
          message: `${donationData.title} is now available for NGOs to claim.`,
          type: 'donation_listed',
          isRead: false,
          relatedDonationId: docRef.id,
        });

        // Also notify NGOs that a new donation is available
        try {
          const ngosQuery = query(
            collection(db, 'users'),
            where('role', '==', 'ngo'),
            limit(50)
          );
          const ngosSnap = await getDocs(ngosQuery);
          const notifyAll = ngosSnap.docs.map((ngoDoc) =>
            notificationService.createNotification({
              userId: ngoDoc.id,
              title: 'New Donation Available',
              message: `"${donationData.title}" has been listed by ${donationData.donorName}.`,
              type: 'donation_listed',
              isRead: false,
              relatedDonationId: docRef.id,
            })
          );
          await Promise.allSettled(notifyAll);
        } catch {}
      } catch {}
      return docRef.id;
    } catch (error) {
      console.error('Error creating donation:', error);
      throw error;
    }
  },

  // Get all available donations (not claimed)
  async getAvailableDonations(): Promise<FoodDonation[]> {
    try {
  const q = query(collection(db, 'donations'), where('status', '==', 'listed'));
      const querySnapshot = await getDocs(q);
  const now = Date.now();
  const items = querySnapshot.docs.map(mapDonationDoc) as FoodDonation[];
      // Filter out expired and sort by createdAt desc
      return items
        .filter(d => d.deadline.getTime() > now)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching donations:', error);
      throw error;
    }
  },

  // Get donations by user ID
  async getDonationsByUser(userId: string): Promise<FoodDonation[]> {
    try {
  const q = query(collection(db, 'donations'), where('donorId', '==', userId));
      const querySnapshot = await getDocs(q);
  const now = Date.now();
  const items = querySnapshot.docs.map(mapDonationDoc) as FoodDonation[];
      return items
        .filter(d => d.deadline.getTime() > now || d.status !== 'listed')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching user donations:', error);
      throw error;
    }
  },

  // Update donation status
  async updateDonationStatus(donationId: string, status: DonationStatus, updates?: Partial<FoodDonation>): Promise<void> {
    try {
      const updateData = {
        status,
        updatedAt: Timestamp.fromDate(new Date()),
        ...updates,
      };
      await updateDoc(doc(db, 'donations', donationId), updateData);
    } catch (error) {
      console.error('Error updating donation status:', error);
      throw error;
    }
  },

  // Claim a donation (for NGOs)
  async claimDonation(donationId: string, ngoId: string, ngoName: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'donations', donationId), {
        status: 'claimed',
        claimedBy: ngoId,
        claimedByName: ngoName,
        updatedAt: Timestamp.fromDate(new Date()),
      });

      // Immediately reflect impact for NGO: count a meal saved on accept
      try {
        await analyticsService.updateNGOAnalytics(ngoId, 1, 0);
      } catch {}

      // Notify donor about claim
      try {
        const donationDoc = await getDoc(doc(db, 'donations', donationId));
        const donation = donationDoc.data() as any;
        if (donation?.donorId) {
          await notificationService.createNotification({
            userId: donation.donorId,
            title: 'Donation Claimed',
            message: `${ngoName} has claimed your donation "${donation.title}".`,
            type: 'donation_claimed',
            isRead: false,
            relatedDonationId: donationId,
          });
        }

        // Notify volunteers of the NGO about pickup request
        try {
          const volunteersQuery = query(
            collection(db, 'users'),
            where('role', '==', 'volunteer'),
            where('selectedNGOs', 'array-contains', ngoId)
          );
          const volunteersSnap = await getDocs(volunteersQuery);
          const notifyVolunteers = volunteersSnap.docs.map((volunteerDoc) =>
            notificationService.createNotification({
              userId: volunteerDoc.id,
              title: 'New Pickup Request',
              message: `${ngoName} needs a driver for "${donation.title}". Tap to accept or reject.`,
              type: 'pickup_request',
              isRead: false,
              relatedDonationId: donationId,
              relatedNGOId: ngoId,
            })
          );
          await Promise.allSettled(notifyVolunteers);
        } catch {}
      } catch {}
    } catch (error) {
      console.error('Error claiming donation:', error);
      throw error;
    }
  },

  // Mark a donation as delivered (by NGO after driver completes)
  async markDonationDelivered(donationId: string): Promise<void> {
    try {
      const donationRef = doc(db, 'donations', donationId);
      const donationSnap = await getDoc(donationRef);
      if (!donationSnap.exists()) throw new Error('Donation not found');
      const donation = donationSnap.data() as any;

      // Update donation status to delivered
      await updateDoc(donationRef, {
        status: 'delivered',
        deliveredAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      });

      // Update NGO analytics: +1 delivery
      if (donation?.claimedBy) {
        try { await analyticsService.updateNGOAnalytics(donation.claimedBy, 0, 1); } catch {}
      }

      // Update volunteer stats: +1 delivery, +1 meal saved (approx)
      if (donation?.assignedVolunteer) {
        try { await analyticsService.updateVolunteerStats(donation.assignedVolunteer, 1, 1); } catch {}
      }

      // Notify relevant users
      try {
        if (donation?.donorId) {
          await notificationService.createNotification({
            userId: donation.donorId,
            title: 'Donation Delivered',
            message: `Your donation "${donation.title}" has been delivered. Thank you!`,
            type: 'delivery_completed',
            isRead: false,
            relatedDonationId: donationId,
          });
        }
        if (donation?.claimedBy) {
          await notificationService.createNotification({
            userId: donation.claimedBy,
            title: 'Delivery Completed',
            message: `The donation "${donation.title}" has been delivered successfully.`,
            type: 'delivery_completed',
            isRead: false,
            relatedDonationId: donationId,
          });
        }
        if (donation?.assignedVolunteer) {
          await notificationService.createNotification({
            userId: donation.assignedVolunteer,
            title: 'Delivery Marked Delivered',
            message: `Thanks! "${donation.title}" was marked delivered.`,
            type: 'delivery_completed',
            isRead: false,
            relatedDonationId: donationId,
          });
        }
      } catch {}
    } catch (error) {
      console.error('Error marking donation delivered:', error);
      throw error;
    }
  },

  // NGO rejects a donation from their view (hide for that NGO)
  async rejectDonationForNGO(donationId: string, ngoId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'donations', donationId), {
        rejectedByNGOs: arrayUnion(ngoId),
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error rejecting donation for NGO:', error);
      throw error;
    }
  },

  // Volunteer accepts pickup request
  async acceptPickupRequest(donationId: string, volunteerId: string, volunteerName: string): Promise<void> {
    try {
      // First check if donation is still available for pickup
      const donationDoc = await getDoc(doc(db, 'donations', donationId));
      const donation = donationDoc.data() as any;
      
      if (!donation) {
        throw new Error('Donation not found');
      }
      
      if (donation.assignedVolunteer) {
        throw new Error('This pickup has already been accepted by another volunteer');
      }
      
      if (donation.status !== 'claimed') {
        throw new Error('This donation is no longer available for pickup');
      }

      // Update donation with volunteer assignment and change status
      await updateDoc(doc(db, 'donations', donationId), {
        assignedVolunteer: volunteerId,
        assignedVolunteerName: volunteerName,
        volunteerStatus: 'accepted',
        status: 'assigned', // Change status to prevent other volunteers from accepting
        updatedAt: Timestamp.fromDate(new Date()),
      });

      // Notify NGO about volunteer acceptance
      try {
        if (donation?.claimedBy) {
          await notificationService.createNotification({
            userId: donation.claimedBy,
            title: 'Volunteer Accepted',
            message: `${volunteerName} has accepted the pickup for "${donation.title}".`,
            type: 'pickup_accepted',
            isRead: false,
            relatedDonationId: donationId,
          });
        }

        // Notify donor about pickup assignment
        if (donation?.donorId) {
          await notificationService.createNotification({
            userId: donation.donorId,
            title: 'Pickup Assigned',
            message: `${volunteerName} will pick up your donation "${donation.title}".`,
            type: 'pickup_assigned',
            isRead: false,
            relatedDonationId: donationId,
          });
        }
      } catch {}
    } catch (error) {
      console.error('Error accepting pickup request:', error);
      throw error;
    }
  },

  // Volunteer rejects pickup request
  async rejectPickupRequest(donationId: string, volunteerId: string, volunteerName: string): Promise<void> {
    try {
      // Just update volunteer status to rejected, don't assign
      await updateDoc(doc(db, 'donations', donationId), {
        volunteerStatus: 'rejected',
        updatedAt: Timestamp.fromDate(new Date()),
      });

      // Notify NGO about rejection
      try {
        const donationDoc = await getDoc(doc(db, 'donations', donationId));
        const donation = donationDoc.data() as any;
        if (donation?.claimedBy) {
          await notificationService.createNotification({
            userId: donation.claimedBy,
            title: 'Volunteer Declined',
            message: `${volunteerName} has declined the pickup for "${donation.title}". Looking for other volunteers.`,
            type: 'pickup_rejected',
            isRead: false,
            relatedDonationId: donationId,
          });
        }
      } catch {}
    } catch (error) {
      console.error('Error rejecting pickup request:', error);
      throw error;
    }
  },

  // Get pending pickup requests for a volunteer
  async getPendingPickupRequests(volunteerId: string): Promise<FoodDonation[]> {
    try {
      // Get user's selected NGOs first
      const userDoc = await getDoc(doc(db, 'users', volunteerId));
      const userData = userDoc.data();
      const selectedNGOs = userData?.selectedNGOs || [];

      if (selectedNGOs.length === 0) return [];

      // Get claimed donations from selected NGOs that don't have assigned volunteers yet
      const q = query(
        collection(db, 'donations'),
        where('status', '==', 'claimed')
      );
      const querySnapshot = await getDocs(q);
      const now = Date.now();
      
      const items = querySnapshot.docs.map(mapDonationDoc) as FoodDonation[];
      return items.filter(d => 
        selectedNGOs.includes(d.claimedBy || '') && 
        !d.assignedVolunteer &&
        d.deadline.getTime() > now
      ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching pending pickup requests:', error);
      throw error;
    }
  },

  // Listen to real-time donation updates
  subscribeToDonations(callback: (donations: FoodDonation[]) => void) {
    const q = query(
      collection(db, 'donations'),
  limit(100)
    );

    return onSnapshot(q, (querySnapshot) => {
      const donations = querySnapshot.docs.map(mapDonationDoc) as FoodDonation[];
      donations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(donations);
    });
  },

  // Listen to real-time updates for a donor's own donations
  subscribeToUserDonations(userId: string, callback: (donations: FoodDonation[]) => void) {
    const q = query(
      collection(db, 'donations'),
  where('donorId', '==', userId)
    );

    return onSnapshot(q, (querySnapshot) => {
      const donations = querySnapshot.docs.map(mapDonationDoc) as FoodDonation[];
      const now = Date.now();
      const visible = donations
        .filter(d => d.deadline.getTime() > now || d.status !== 'listed')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(visible);
    });
  },

  // Listen to real-time updates for available donations (for NGOs)
  subscribeToAvailableDonations(callback: (donations: FoodDonation[]) => void) {
    const q = query(
      collection(db, 'donations'),
  where('status', '==', 'listed')
    );

    return onSnapshot(q, (querySnapshot) => {
      const donations = querySnapshot.docs.map(mapDonationDoc) as FoodDonation[];
      const now = Date.now();
      const visible = donations
        .filter(d => d.deadline.getTime() > now)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(visible);
    });
  },

  // Listen to real-time updates for donations claimed by a specific NGO
  subscribeToClaimedDonations(ngoId: string, callback: (donations: FoodDonation[]) => void) {
    const q = query(
      collection(db, 'donations'),
      where('claimedBy', '==', ngoId)
    );

    return onSnapshot(q, (querySnapshot) => {
      const donations = querySnapshot.docs.map(mapDonationDoc) as FoodDonation[];
      // Exclude delivered from the active dashboard feed
      const active = donations.filter(d => d.status !== 'delivered');
      const sorted = active.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(sorted);
    });
  },

  // Get claimed donations for NGO
  async getClaimedDonations(ngoId: string): Promise<FoodDonation[]> {
    try {
  const q = query(collection(db, 'donations'), where('claimedBy', '==', ngoId));
      const querySnapshot = await getDocs(q);
  const items = querySnapshot.docs.map(mapDonationDoc) as FoodDonation[];
      return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching claimed donations:', error);
      throw error;
    }
  },

  // Get available pickups for volunteers
  async getAvailablePickups(): Promise<FoodDonation[]> {
    try {
      // Firestore doesn't support equality to null reliably in queries.
      // Fetch claimed donations and filter client-side for unassigned.
      const q = query(
        collection(db, 'donations'),
        where('status', '==', 'claimed')
      );
  const querySnapshot = await getDocs(q);
  const items = querySnapshot.docs.map(mapDonationDoc) as FoodDonation[];
      const now = Date.now();
      return items
        .filter(d => (!('assignedVolunteer' in d) || !d.assignedVolunteer) && d.deadline.getTime() > now)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching available pickups:', error);
      throw error;
    }
  },

  // Get all NGOs for volunteer selection
  async getAllNGOs(): Promise<{ id: string; name: string; organizationName: string; }[]> {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'ngo'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        organizationName: doc.data().organizationName || doc.data().name,
      }));
    } catch (error) {
      console.error('Error fetching NGOs:', error);
      throw error;
    }
  },

  // Get donation by ID
  async getDonationById(donationId: string): Promise<FoodDonation | null> {
    try {
      const docSnap = await getDoc(doc(db, 'donations', donationId));
      if (!docSnap.exists()) return null;
      return mapDonationDoc(docSnap);
    } catch (error) {
      console.error('Error fetching donation:', error);
      throw error;
    }
  },

  // Get user by ID
  async getUserById(userId: string): Promise<any | null> {
    try {
      const docSnap = await getDoc(doc(db, 'users', userId));
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },
};

// Notification Services
export const notificationService = {
  // Create notification
  async createNotification(notificationData: Omit<AppNotification, 'id' | 'createdAt'>): Promise<void> {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        createdAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Get user notifications
  async getUserNotifications(userId: string): Promise<AppNotification[]> {
    try {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId), limit(100));
      const querySnapshot = await getDocs(q);
  const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as AppNotification[];
  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },
};

// Analytics Services
export const analyticsService = {
  // Update NGO analytics
  async updateNGOAnalytics(ngoId: string, mealsSaved: number, deliveriesCompleted: number): Promise<void> {
    try {
      const analyticsRef = doc(db, 'ngo_analytics', ngoId);
      const analyticsDoc = await getDoc(analyticsRef);
      
      if (analyticsDoc.exists()) {
        const currentData = analyticsDoc.data() as NGOAnalytics;
        await updateDoc(analyticsRef, {
          totalMealsSaved: currentData.totalMealsSaved + mealsSaved,
          totalDeliveries: currentData.totalDeliveries + deliveriesCompleted,
          lastUpdated: Timestamp.fromDate(new Date()),
        });
      } else {
        await setDoc(analyticsRef, {
          ngoId,
          totalMealsSaved: mealsSaved,
          totalDeliveries: deliveriesCompleted,
          totalDonorsHelped: 1,
          monthlyStats: [],
          lastUpdated: Timestamp.fromDate(new Date()),
        });
      }
    } catch (error) {
      console.error('Error updating NGO analytics:', error);
      throw error;
    }
  },

  // Get NGO analytics
  async getNGOAnalytics(ngoId: string): Promise<NGOAnalytics | null> {
    try {
      const analyticsDoc = await getDoc(doc(db, 'ngo_analytics', ngoId));
      if (analyticsDoc.exists()) {
        return {
          id: analyticsDoc.id,
          ...analyticsDoc.data(),
          lastUpdated: analyticsDoc.data().lastUpdated.toDate(),
        } as NGOAnalytics;
      }
      return null;
    } catch (error) {
      console.error('Error fetching NGO analytics:', error);
      throw error;
    }
  },

  // Update volunteer stats
  async updateVolunteerStats(volunteerId: string, deliveriesCompleted: number, mealsSaved: number): Promise<void> {
    try {
      const statsRef = doc(db, 'volunteer_stats', volunteerId);
      const statsDoc = await getDoc(statsRef);
      
      if (statsDoc.exists()) {
        const currentData = statsDoc.data() as VolunteerStats;
        await updateDoc(statsRef, {
          totalDeliveries: currentData.totalDeliveries + deliveriesCompleted,
          totalMealsSaved: currentData.totalMealsSaved + mealsSaved,
          lastDelivery: Timestamp.fromDate(new Date()),
        });
      } else {
        await setDoc(statsRef, {
          volunteerId,
          totalDeliveries: deliveriesCompleted,
          totalMilesDriven: 0,
          totalMealsSaved: mealsSaved,
          rating: 5.0,
          badges: [],
          lastDelivery: Timestamp.fromDate(new Date()),
        });
      }
    } catch (error) {
      console.error('Error updating volunteer stats:', error);
      throw error;
    }
  },

  // Get volunteer stats
  async getVolunteerStats(volunteerId: string): Promise<VolunteerStats | null> {
    try {
      const statsDoc = await getDoc(doc(db, 'volunteer_stats', volunteerId));
      if (statsDoc.exists()) {
        const data = statsDoc.data() as any;
        return {
          id: statsDoc.id,
          volunteerId,
          totalDeliveries: data.totalDeliveries || 0,
          totalMilesDriven: data.totalMilesDriven || 0,
          totalMealsSaved: data.totalMealsSaved || 0,
          rating: data.rating || 5,
          badges: data.badges || [],
          lastDelivery: data.lastDelivery?.toDate?.() || undefined,
        } as VolunteerStats;
      }
      return null;
    } catch (error) {
      console.error('Error fetching volunteer stats:', error);
      throw error;
    }
  },

  // Get volunteer leaderboard
  async getVolunteerLeaderboard(): Promise<VolunteerStats[]> {
    try {
      const q = query(
        collection(db, 'volunteer_stats'),
        orderBy('totalMealsSaved', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastDelivery: doc.data().lastDelivery?.toDate(),
      })) as VolunteerStats[];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  },
};
