import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';
import { donationService } from '../../services/firebaseService';
import { LocationService } from '../../services/locationService';
import { FoodDonation } from '../../types';

export default function AddDonationScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    foodType: '',
    quantity: '',
    deadlineDate: '', // YYYY-MM-DD
    deadlineTime: '', // HH:MM
    address: '',
    isUrgent: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const toBase64Web = async (uri: string): Promise<string | null> => {
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Failed converting image to base64 (web):', e);
      return null;
    }
  };

  // Web fallback: reverse geocoding using OpenStreetMap Nominatim
  const reverseGeocodeWeb = async (lat: number, lon: number): Promise<string | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          // Browsers set User-Agent and Referer automatically; keep headers minimal
          'Accept': 'application/json',
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      // Prefer display_name if present
      if (data?.display_name) return data.display_name as string;
      const a = data?.address || {};
      const parts = [
        [a.road, a.house_number].filter(Boolean).join(' '),
        a.suburb || a.neighbourhood,
        a.city || a.town || a.village,
        a.state,
        a.postcode,
        a.country,
      ].filter(Boolean);
      return parts.length ? parts.join(', ') : null;
    } catch (e) {
      console.warn('Web reverse geocoding failed:', e);
      return null;
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    }

    if (!formData.deadlineDate) {
      newErrors.deadlineDate = 'Deadline date is required';
    }
    if (!formData.deadlineTime) {
      newErrors.deadlineTime = 'Deadline time is required';
    } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.deadlineTime)) {
      newErrors.deadlineTime = 'Invalid time format (use HH:MM)';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    // On web, permissions are not required
    if (Platform.OS !== 'web') {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.base64) {
        setImage(asset.base64);
  } else if ((Platform as any).OS === 'web' && asset.uri) {
        const b64 = await toBase64Web(asset.uri);
        if (b64) setImage(b64);
      }
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      // Camera not supported on web reliably; fallback to gallery
      return pickImage();
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.base64) {
        setImage(asset.base64);
  } else if ((Platform as any).OS === 'web' && asset.uri) {
        const b64 = await toBase64Web(asset.uri);
        if (b64) setImage(b64);
      }
    }
  };

  const getCurrentLocation = async () => {
    try {
      const currentLocation = await LocationService.getCurrentLocation();
      if (!currentLocation) {
        Alert.alert('Error', 'Could not get your current location. Please try again or enter address manually.');
        return;
      }

      setLocation(currentLocation);

      // Use enhanced reverse geocoding
      const address = await LocationService.reverseGeocode({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (address) {
        setFormData({ ...formData, address: address.fullAddress });
      } else {
        // Fallback: set lat/long string if reverse geocoding fails
        const { latitude, longitude } = currentLocation.coords;
        setFormData({ ...formData, address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get location. Please try again or enter address manually.');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;

    setLoading(true);
    try {
  // Compose deadline Date from date and time
  const [yyyy, mm, dd] = formData.deadlineDate.split('-').map(Number);
  const [hh, mi] = formData.deadlineTime.split(':').map(Number);
  const deadline = new Date(yyyy, (mm - 1), dd, hh, mi, 0, 0);

      const donationData: Omit<FoodDonation, 'id' | 'createdAt' | 'updatedAt'> = {
        donorId: user.id,
        donorName: user.name,
        title: formData.title,
        description: formData.description,
        foodType: formData.foodType || 'General',
        quantity: formData.quantity,
        imageBase64: image || undefined,
        pickupLocation: {
          address: formData.address,
          latitude: location?.coords.latitude || 0,
          longitude: location?.coords.longitude || 0,
        },
  deadline,
        status: 'listed',
        isUrgent: formData.isUrgent,
  expiresAt: undefined,
      };

      const donationId = await donationService.createDonation(donationData);
      
      Alert.alert('Success', 'Your food donation has been listed!', [
        { text: 'OK', onPress: () => resetForm() }
      ]);
  // Navigate to Home so donor can see their listing immediately
  router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error creating donation:', error);
      Alert.alert('Error', 'Failed to create donation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      foodType: '',
      quantity: '',
      deadlineDate: '',
      deadlineTime: '',
      address: '',
      isUrgent: false,
    });
    setImage(null);
    setLocation(null);
    setErrors({});
  };

  const showImagePicker = () => {
    if ((Platform as any).OS === 'web') {
      // On web, open file picker directly for better UX
      pickImage();
      return;
    }
    Alert.alert(
      'Select Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (user?.role !== 'donor') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>
            Only food donors can create donations.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Food Donation</Text>
            <Text style={styles.subtitle}>
              Share your surplus food with those in need
            </Text>
          </View>

          <View style={styles.form}>
            {/* Photo Upload */}
            <TouchableOpacity style={styles.photoContainer} onPress={showImagePicker}>
              {image ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${image}` }}
                  style={styles.photo}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={40} color="#9ca3af" />
                  <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <InputField
              label="Food Title"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              error={errors.title}
              placeholder="e.g., Fresh vegetables, Cooked meals"
              containerStyle={styles.inputContainer}
            />

            <InputField
              label="Description"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              error={errors.description}
              placeholder="Describe the food items"
              multiline
              numberOfLines={3}
              containerStyle={styles.inputContainer}
            />

            <InputField
              label="Food Type (Optional)"
              value={formData.foodType}
              onChangeText={(text) => setFormData({ ...formData, foodType: text })}
              placeholder="e.g., Vegetarian, Non-veg, Vegan"
              containerStyle={styles.inputContainer}
            />

            <InputField
              label="Quantity"
              value={formData.quantity}
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
              error={errors.quantity}
              placeholder="e.g., 50 meals, 10 kg, 20 portions"
              containerStyle={styles.inputContainer}
            />

            <View style={styles.timeContainer}>
              <View style={styles.timeField}>
                <InputField
                  label="Deadline Date"
                  value={formData.deadlineDate}
                  onChangeText={(text) => setFormData({ ...formData, deadlineDate: text })}
                  error={errors.deadlineDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.timeField}>
                <InputField
                  label="Deadline Time"
                  value={formData.deadlineTime}
                  onChangeText={(text) => setFormData({ ...formData, deadlineTime: text })}
                  error={errors.deadlineTime}
                  placeholder="HH:MM"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <Text style={styles.timeHint}>Set a single deadline (e.g., 2025-09-10 and 17:00)</Text>

            <View style={styles.locationContainer}>
              <InputField
                label="Pickup Address"
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                error={errors.address}
                placeholder="Enter pickup address"
                containerStyle={styles.addressInput}
              />
              <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
                <Ionicons name="location" size={24} color="#22c55e" />
              </TouchableOpacity>
            </View>

            {/* Urgent Toggle */}
            <TouchableOpacity
              style={[styles.urgentToggle, formData.isUrgent && styles.urgentToggleActive]}
              onPress={() => setFormData({ ...formData, isUrgent: !formData.isUrgent })}
            >
              <View style={styles.urgentToggleContent}>
                <Ionicons
                  name={formData.isUrgent ? "warning" : "warning-outline"}
                  size={24}
                  color={formData.isUrgent ? "#ffffff" : "#ef4444"}
                />
                <View style={styles.urgentTextContainer}>
                  <Text style={[styles.urgentTitle, formData.isUrgent && styles.urgentTitleActive]}>
                    Mark as Urgent
                  </Text>
                  <Text style={[styles.urgentSubtitle, formData.isUrgent && styles.urgentSubtitleActive]}>
                    Food expires within 2 hours
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <Button
              title="List Food Donation"
              onPress={handleSubmit}
              loading={loading}
              size="large"
              style={styles.submitButton}
            />
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
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  photoContainer: {
    marginBottom: 24,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 8,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeField: {
    flex: 1,
    marginHorizontal: 4,
  },
  timeHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  addressInput: {
    flex: 1,
    marginRight: 12,
  },
  locationButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  urgentToggle: {
    borderWidth: 2,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    backgroundColor: '#fef2f2',
  },
  urgentToggleActive: {
    borderColor: '#ef4444',
    backgroundColor: '#ef4444',
  },
  urgentToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgentTextContainer: {
    marginLeft: 12,
  },
  urgentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 2,
  },
  urgentTitleActive: {
    color: '#ffffff',
  },
  urgentSubtitle: {
    fontSize: 14,
    color: '#dc2626',
  },
  urgentSubtitleActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  submitButton: {
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
