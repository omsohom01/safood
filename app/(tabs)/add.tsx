import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { HamburgerMenu } from '../../components/ui/HamburgerMenu';
import { InputField } from '../../components/ui/InputField';
import Select from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import { donationService } from '../../services/firebaseService';
import { LocationService } from '../../services/locationService';
import { FoodDonation } from '../../types';

const { width, height } = Dimensions.get('window');

export default function AddDonationScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    foodType: '',
    quantity: '',
    deadlineDate: '', // YYYY-MM-DD
    deadlineTime: '', // HH:MM
    selectedDeadlineOption: '', // Track which option was selected
    address: '',
    isUrgent: false,
  });  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize animations
  useEffect(() => {
    // Main entrance animation
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
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous floating animation for background elements
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

    // Rotate animation for decorative elements
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
  }, []);

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
      newErrors.deadlineTime = 'Deadline is required';
    } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.deadlineTime)) {
      newErrors.deadlineTime = 'Invalid time (use a preset)';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    // Animate progress
    Animated.timing(progressAnim, {
      toValue: 0.3,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // On web, permissions are not required
    if (Platform.OS !== 'web') {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        Animated.timing(progressAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
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
        // Complete progress animation
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          setTimeout(() => {
            Animated.timing(progressAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
          }, 1000);
        });
      } else if ((Platform as any).OS === 'web' && asset.uri) {
        const b64 = await toBase64Web(asset.uri);
        if (b64) {
          setImage(b64);
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            setTimeout(() => {
              Animated.timing(progressAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
            }, 1000);
          });
        }
      }
    } else {
      Animated.timing(progressAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
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
  router.replace('/home');
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
      selectedDeadlineOption: '',
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
        <HamburgerMenu />
        <View style={styles.errorBackground}>
          <Animated.View style={[styles.errorContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle" size={64} color="#22c55e" />
            </View>
            <Text style={styles.errorTitle}>Access Denied</Text>
            <Text style={styles.errorText}>
              Only food donors can create donations.
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Hamburger Menu */}
          <HamburgerMenu currentRoute="/(tabs)/add" />      {/* Clean Background with Green Accents */}
      <View style={styles.backgroundContainer}>
        {/* Subtle Floating Background Elements */}
        <Animated.View style={[styles.floatingAccent1, {
          transform: [{
            translateY: floatingAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -15]
            })
          }]
        }]} />
        <Animated.View style={[styles.floatingAccent2, {
          transform: [{
            translateX: floatingAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 10]
            })
          }]
        }]} />

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, {
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            })
          }]} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          <Animated.View style={[styles.content, {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }]}>
            <View style={styles.header}>
              <Text style={styles.title}>Add Food Donation</Text>
              <Text style={styles.subtitle}>
                Share your surplus food with those in need
              </Text>
              <View style={styles.headerDivider} />
            </View>

            <Animated.View style={[styles.form, {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 25]
                })
              }]
            }]}>
              {/* Enhanced Photo Upload with Green Theme */}
              <TouchableOpacity style={styles.photoContainer} onPress={showImagePicker}>
                <View style={styles.photoWrapper}>
                  {image ? (
                    <View style={styles.imageWrapper}>
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${image}` }}
                        style={styles.photo}
                      />
                      <View style={styles.imageOverlay}>
                        <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                        <Text style={styles.imageOverlayText}>Photo Added</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Animated.View style={[styles.cameraIcon, {
                        transform: [{
                          scale: floatingAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.05]
                          })
                        }]
                      }]}>
                        <View style={styles.cameraIconContainer}>
                          <Ionicons name="camera" size={28} color="#22c55e" />
                        </View>
                      </Animated.View>
                      <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                      <Text style={styles.photoPlaceholderSubtext}>Tap to capture or select from gallery</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <InputField
                label="Food Title"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                error={errors.title}
                placeholder="e.g., Fresh vegetables"
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

              {/* Food Type Select */}
              <Select
                label="Food Type"
                value={formData.foodType}
                options={[
                  { label: 'Vegetarian', value: 'Vegetarian' },
                  { label: 'Non-Veg', value: 'Non-Veg' },
                  { label: 'Vegan', value: 'Vegan' },
                  { label: 'Bakery', value: 'Bakery' },
                  { label: 'Packed Meals', value: 'Packed Meals' },
                  { label: 'Groceries', value: 'Groceries' },
                  { label: 'Other', value: 'Other' },
                ]}
                onChange={(v) => setFormData({ ...formData, foodType: v })}
                placeholder="Select food type"
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

              {/* Deadline Presets Select */}
              <Select
                label="Pickup Deadline"
                value={formData.selectedDeadlineOption}
                options={[
                  { label: 'In 1 hour', value: 'in_1h' },
                  { label: 'In 2 hours', value: 'in_2h' },
                  { label: 'End of day (8 PM)', value: 'eod' },
                  { label: 'Tomorrow (12 PM)', value: 'tomorrow_noon' },
                ]}
                onChange={(v) => {
                  const now = new Date();
                  let deadline = new Date(now);
                  if (v === 'in_1h') deadline = new Date(now.getTime() + 1 * 60 * 60 * 1000);
                  if (v === 'in_2h') deadline = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                  if (v === 'eod') {
                    deadline.setHours(20, 0, 0, 0);
                    if (deadline < now) deadline = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                  }
                  if (v === 'tomorrow_noon') {
                    const t = new Date(now);
                    t.setDate(t.getDate() + 1);
                    t.setHours(12, 0, 0, 0);
                    deadline = t;
                  }
                  const yyyy = deadline.getFullYear();
                  const mm = String(deadline.getMonth() + 1).padStart(2, '0');
                  const dd = String(deadline.getDate()).padStart(2, '0');
                  const hh = String(deadline.getHours()).padStart(2, '0');
                  const mi = String(deadline.getMinutes()).padStart(2, '0');
                  setFormData({
                    ...formData,
                    selectedDeadlineOption: v, // Store the selected option
                    deadlineDate: `${yyyy}-${mm}-${dd}`,
                    deadlineTime: `${hh}:${mi}`,
                  });
                }}
                placeholder="Choose a deadline"
                containerStyle={styles.inputContainer}
              />

              {/* Show selected deadline for confirmation */}
              {formData.deadlineDate && formData.deadlineTime && (
                <View style={styles.deadlinePreview}>
                  <Ionicons name="time-outline" size={16} color="#22c55e" />
                  <Text style={styles.deadlinePreviewText}>
                    Deadline: {new Date(`${formData.deadlineDate}T${formData.deadlineTime}`).toLocaleString()}
                  </Text>
                </View>
              )}

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
                  <View style={styles.locationButtonContent}>
                    <Ionicons name="location" size={22} color="#ffffff" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Clean Urgent Toggle */}
              <TouchableOpacity
                style={[styles.urgentToggle, formData.isUrgent && styles.urgentToggleActive]}
                onPress={() => setFormData({ ...formData, isUrgent: !formData.isUrgent })}
              >
                <View style={styles.urgentToggleContent}>
                  <Animated.View style={[styles.urgentIcon, {
                    transform: [{
                      scale: formData.isUrgent ? 1.1 : 1
                    }]
                  }]}>
                    <Ionicons
                      name={formData.isUrgent ? "warning" : "warning-outline"}
                      size={24}
                      color={formData.isUrgent ? "#ffffff" : "#22c55e"}
                    />
                  </Animated.View>
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
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  backgroundContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  floatingAccent1: {
    position: 'absolute',
    top: 120,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    zIndex: 0,
  },
  floatingAccent2: {
    position: 'absolute',
    top: 200,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    zIndex: 0,
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#f1f5f9',
    zIndex: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 40,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  headerDivider: {
    width: 60,
    height: 4,
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  photoContainer: {
    marginBottom: 28,
  },
  photoWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  imageWrapper: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 14,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  imageOverlayText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  photoPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  cameraIcon: {
    marginBottom: 12,
  },
  cameraIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#bbf7d0',
  },
  photoPlaceholderText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '600',
  },
  photoPlaceholderSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '400',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeField: {
    flex: 1,
    marginHorizontal: 6,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 28,
  },
  addressInput: {
    flex: 1,
    marginRight: 12,
  },
  locationButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  locationButtonContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  urgentToggle: {
    borderRadius: 16,
    marginBottom: 28,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  urgentToggleActive: {
    borderColor: '#22c55e',
    backgroundColor: '#22c55e',
  },
  urgentToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgentIcon: {
    marginRight: 12,
  },
  urgentTextContainer: {
    flex: 1,
  },
  urgentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
    marginBottom: 2,
  },
  urgentTitleActive: {
    color: '#ffffff',
  },
  urgentSubtitle: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '500',
  },
  urgentSubtitleActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  submitButton: {
    marginTop: 12,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorBackground: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorIconContainer: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 50,
    backgroundColor: '#f0fdf4',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  deadlinePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  deadlinePreviewText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
    marginLeft: 8,
  },
});
