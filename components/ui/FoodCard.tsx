import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Linking, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { FoodDonation, UserRole } from '../../types';

interface FoodCardProps {
  donation: FoodDonation;
  onPress: () => void;
  onActionPress?: () => void;
  actionLabel?: string;
  secondaryActionLabel?: string;
  onSecondaryActionPress?: () => void;
  showStatus?: boolean;
  style?: ViewStyle;
  viewerRole?: UserRole;
  viewerUserId?: string;
  openInOSM?: boolean; // If true, tapping card opens OSM directions to donation address
}

export const FoodCard: React.FC<FoodCardProps> = ({
  donation,
  onPress,
  onActionPress,
  actionLabel,
  secondaryActionLabel,
  onSecondaryActionPress,
  showStatus = true,
  style,
  viewerRole,
  viewerUserId,
}) => {
  const getBadge = (status: string): { text: string; color: string } => {
    const isOwner = viewerUserId && viewerUserId === donation.donorId;
    if (status === 'listed') {
      // Donor should see 'Pending' for their own listed items
      if (isOwner) return { text: 'Pending', color: '#f59e0b' };
      return { text: 'Available', color: '#22c55e' };
    }
    if (status === 'claimed') return { text: 'Claimed', color: '#f97316' };
    if (status === 'picked_up') return { text: 'Picked Up', color: '#3b82f6' };
    if (status === 'delivered') return { text: 'Delivered', color: '#8b5cf6' };
    return { text: status, color: '#6b7280' };
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const cardStyle: ViewStyle = {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...style,
  };

  return (
    <TouchableOpacity
      style={cardStyle}
      onPress={async () => {
        if (viewerRole === 'volunteer') {
          // Prefer opening OSM with address
          const addr = donation.pickupLocation.address;
          const url = `https://www.openstreetmap.org/directions?to=${encodeURIComponent(addr)}`;
          try { await Linking.openURL(url); } catch {}
          return;
        }
        onPress();
      }}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row' }}>
        {/* Food Image */}
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 12,
            backgroundColor: '#f3f4f6',
            marginRight: 12,
            overflow: 'hidden',
          }}
        >
          {donation.imageBase64 ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${donation.imageBase64}` }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#e5e7eb',
              }}
            >
              <Ionicons name="fast-food" size={32} color="#9ca3af" />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 }} numberOfLines={1}>
              {donation.title}
            </Text>
            
            {/* Badge Container */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {/* Urgent Badge */}
              {donation.isUrgent && (
                <View
                  style={{
                    backgroundColor: '#ef4444',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="warning" size={10} color="#ffffff" />
                  <Text style={{ fontSize: 9, fontWeight: '600', color: '#ffffff', marginLeft: 2 }}>
                    URGENT
                  </Text>
                </View>
              )}
              
              {/* Status Badge */}
              {showStatus && (
                <View
                  style={{
                    backgroundColor: getBadge(donation.status).color,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#ffffff' }}>
                    {getBadge(donation.status).text}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }} numberOfLines={2}>
            {donation.description}
          </Text>

          {/* Details */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons name="time-outline" size={14} color="#6b7280" />
            <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
              Deadline: {donation.deadline.toLocaleDateString()} {formatTime(donation.deadline)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="location-outline" size={14} color="#6b7280" />
            <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4, flex: 1 }} numberOfLines={1}>
              {donation.pickupLocation.address}
            </Text>
          </View>

          {/* Action Buttons */}
          {actionLabel && onActionPress && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={{
                  flex: secondaryActionLabel ? 1 : undefined,
                  backgroundColor: actionLabel.toLowerCase().includes('delivered') ? '#16a34a' : '#22c55e',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 4,
                  elevation: 3,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
                onPress={onActionPress}
                activeOpacity={0.9}
              >
                {actionLabel.toLowerCase().includes('delivered') ? (
                  <Ionicons name="checkmark-done" size={16} color="#ffffff" />
                ) : (
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                )}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff', marginLeft: 8 }}>
                  {actionLabel}
                </Text>
              </TouchableOpacity>

              {secondaryActionLabel && onSecondaryActionPress && (
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#ffffff',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: '#ef4444',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                  }}
                  onPress={onSecondaryActionPress}
                  activeOpacity={0.9}
                >
                  <Ionicons name="close" size={16} color="#ef4444" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444', marginLeft: 8 }}>
                    {secondaryActionLabel}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};
