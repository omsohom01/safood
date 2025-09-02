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
import { Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    organizationName: user?.organizationName || '',
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (user?.role === 'ngo' && !formData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
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
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.base64) {
        setProfileImage(asset.base64);
  } else if ((Platform as any).OS === 'web' && asset.uri) {
        const b64 = await toBase64Web(asset.uri);
        if (b64) setProfileImage(b64);
      }
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      return pickImage();
    }
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.base64) {
        setProfileImage(asset.base64);
  } else if ((Platform as any).OS === 'web' && asset.uri) {
        const b64 = await toBase64Web(asset.uri);
        if (b64) setProfileImage(b64);
      }
    }
  };

  const showImagePicker = () => {
    if ((Platform as any).OS === 'web') {
      // On web, open file picker directly for better UX
      pickImage();
      return;
    }
    Alert.alert(
      'Select Profile Photo',
      'Choose how you want to add a profile photo',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    if (!validateForm() || !user) return;

    setLoading(true);
    try {
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        updatedAt: new Date(),
        ...(user.role === 'ngo' && { organizationName: formData.organizationName }),
        ...(profileImage && { profileImageBase64: profileImage }),
      };

      await updateDoc(doc(db, 'users', user.id), updateData);
      
      // Refresh user data in context
      await refreshUser();
      
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
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

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={getRoleColor()} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Profile Photo */}
          <TouchableOpacity style={styles.photoContainer} onPress={showImagePicker}>
            {profileImage || user.profileImageBase64 ? (
              <Image
                source={{ 
                  uri: `data:image/jpeg;base64,${profileImage || user.profileImageBase64}` 
                }}
                style={styles.photo}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={40} color="#9ca3af" />
                <Text style={styles.photoPlaceholderText}>Add Photo</Text>
              </View>
            )}
            <View style={styles.photoOverlay}>
              <Ionicons name="camera" size={20} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <View style={styles.form}>
            <InputField
              label="Full Name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              error={errors.name}
              placeholder="Enter your full name"
              containerStyle={styles.inputContainer}
            />

            <InputField
              label="Email Address"
              value={user.email}
              editable={false}
              placeholder="Email cannot be changed"
              containerStyle={styles.inputContainer}
              inputStyle={styles.disabledInput}
            />

            <InputField
              label="Phone Number"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              containerStyle={styles.inputContainer}
            />

            <InputField
              label="Address"
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Enter your address"
              multiline
              numberOfLines={2}
              containerStyle={styles.inputContainer}
            />

            {user.role === 'ngo' && (
              <InputField
                label="Organization Name"
                value={formData.organizationName}
                onChangeText={(text) => setFormData({ ...formData, organizationName: text })}
                error={errors.organizationName}
                placeholder="Enter organization name"
                containerStyle={styles.inputContainer}
              />
            )}

            <View style={styles.roleInfo}>
              <Text style={styles.roleLabel}>Account Type</Text>
              <Text style={styles.roleValue}>{user.role.toUpperCase()}</Text>
              <Text style={styles.roleNote}>Account type cannot be changed</Text>
            </View>

            <Button
              title="Save Changes"
              onPress={handleSave}
              loading={loading}
              size="large"
              style={styles.saveButton}
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    padding: 24,
    paddingTop: 0,
    marginTop: -12,
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontWeight: '500',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
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
  inputContainer: {
    marginBottom: 16,
  },
  disabledInput: {
    color: '#9ca3af',
    backgroundColor: '#f9fafb',
  },
  roleInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  roleValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  roleNote: {
    fontSize: 12,
    color: '#9ca3af',
  },
  saveButton: {
    marginTop: 8,
  },
});
