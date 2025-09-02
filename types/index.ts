// User types
export type UserRole = 'donor' | 'ngo' | 'volunteer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  address?: string;
  organizationName?: string; // For NGOs
  selectedNGOs?: string[]; // For volunteers - NGO IDs they volunteer for
  profileImage?: string;
  profileImageBase64?: string; // Base64 encoded profile image
  createdAt: Date;
  isVerified?: boolean;
}

// Donation types
export type DonationStatus = 'listed' | 'claimed' | 'assigned' | 'picked_up' | 'delivered';

export interface FoodDonation {
  id: string;
  donorId: string;
  donorName: string;
  title: string;
  description: string;
  foodType: string;
  quantity: string;
  imageBase64?: string; // Base64 encoded image
  pickupLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  // Deadline by which the donation should be picked up
  deadline: Date;
  status: DonationStatus;
  claimedBy?: string; // NGO ID
  claimedByName?: string;
  assignedVolunteer?: string; // Volunteer ID
  assignedVolunteerName?: string;
  volunteerStatus?: 'pending' | 'accepted' | 'rejected'; // Volunteer response status
  createdAt: Date;
  updatedAt: Date;
  isUrgent?: boolean;
  // Deprecated: use deadline
  expiresAt?: Date;
}

// Notification types
export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'donation_listed' | 'donation_claimed' | 'pickup_assigned' | 'pickup_request' | 'pickup_accepted' | 'pickup_rejected' | 'delivery_completed' | 'urgent_request';
  isRead: boolean;
  createdAt: Date;
  relatedDonationId?: string;
  relatedNGOId?: string;
}

// Analytics types
export interface NGOAnalytics {
  id: string;
  ngoId: string;
  totalMealsSaved: number;
  totalDeliveries: number;
  totalDonorsHelped: number;
  monthlyStats: {
    month: string;
    mealsSaved: number;
    deliveries: number;
  }[];
  lastUpdated: Date;
}

// Volunteer stats
export interface VolunteerStats {
  id: string;
  volunteerId: string;
  totalDeliveries: number;
  totalMilesDriven: number;
  totalMealsSaved: number;
  rating: number;
  badges: string[];
  lastDelivery?: Date;
}

// Location types
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

// Chat/Message types (for future enhancement)
export interface ChatMessage {
  id: string;
  donationId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}
