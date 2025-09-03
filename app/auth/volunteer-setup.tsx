import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { NGOSelection } from '../../components/ui/NGOSelection';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function VolunteerSetupScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleNGOUpdate = async (selectedNGOs: string[]) => {
    if (!user) return;

    setLoading(true);
    try {
      // Update user document in Firestore
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { selectedNGOs });
      // Navigate immediately to dashboard (tabs/home)
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error updating NGO selection:', error);
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Direct navigation without modal prompts for web compatibility
    router.replace('/(tabs)/home');
  };

  if (!user || user.role !== 'volunteer') {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Invalid access</Text>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome, {user.name}!</Text>
            <Text style={styles.subtitle}>
              Let's set up your volunteer profile. Choose the NGOs you'd like to volunteer for.
            </Text>
          </View>

          {/* NGO Selection Container */}
          <View style={styles.selectionContainer}>
            <NGOSelection
              user={user}
              onUpdate={handleNGOUpdate}
              onClose={() => {}} // No close button in setup flow
            />
          </View>

          {/* Skip Button */}
          <View style={styles.footer}>
            <Button
              title="Skip for Now"
              onPress={handleSkip}
              variant="outline"
              style={styles.skipButton}
              textStyle={styles.skipButtonText}
              disabled={loading}
            />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  selectionContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  footer: {
    paddingBottom: 20,
  },
  skipButton: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
  },
  skipButtonText: {
    color: '#ffffff',
  },
});
