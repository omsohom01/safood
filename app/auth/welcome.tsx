import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Platform, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  return (
    <LinearGradient
      colors={['#22c55e', '#16a34a']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
          {/* Logo/Icon */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="restaurant" size={60} color="#ffffff" />
            </View>
            <Text style={styles.appName}>Food Rescue</Text>
            <Text style={styles.tagline}>Fighting hunger, reducing waste</Text>
          </View>

          {/* Welcome Text */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Welcome to Food Rescue</Text>
            <Text style={styles.welcomeSubtitle}>
              Join our mission to connect surplus food with those who need it most. 
              Make a difference in your community today.
            </Text>
          </View>

          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <Text style={styles.roleTitle}>Join as:</Text>
            
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => router.push('/auth/signup?role=donor')}
              activeOpacity={0.8}
            >
              <View style={styles.roleCardContent}>
                <Ionicons name="storefront" size={32} color="#22c55e" />
                <View style={styles.roleTextContainer}>
                  <Text style={styles.roleCardTitle}>Food Donor</Text>
                  <Text style={styles.roleCardSubtitle}>
                    Share surplus food from your restaurant, store, or home
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => router.push('/auth/signup?role=ngo')}
              activeOpacity={0.8}
            >
              <View style={styles.roleCardContent}>
                <Ionicons name="heart" size={32} color="#f97316" />
                <View style={styles.roleTextContainer}>
                  <Text style={styles.roleCardTitle}>NGO/Charity</Text>
                  <Text style={styles.roleCardSubtitle}>
                    Claim food donations for your organization or community
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => router.push('/auth/signup?role=volunteer')}
              activeOpacity={0.8}
            >
              <View style={styles.roleCardContent}>
                <Ionicons name="car" size={32} color="#3b82f6" />
                <View style={styles.roleTextContainer}>
                  <Text style={styles.roleCardTitle}>Volunteer Driver</Text>
                  <Text style={styles.roleCardSubtitle}>
                    Help deliver food from donors to those in need
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Sign In Link */}
          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/auth/signin')}>
              <Text style={styles.signInLink}> Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  safeArea: {
    flex: 1,
  } as ViewStyle,
  scrollContainer: {
    flexGrow: 1,
    minHeight: Platform.OS === 'web' ? '100vh' : height,
  } as ViewStyle,
  content: {
    paddingHorizontal: Math.min(24, width * 0.06),
    paddingVertical: 20,
    minHeight: Platform.OS === 'web' ? '100vh' : height * 0.9,
    justifyContent: 'space-between',
  } as ViewStyle,
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  } as ViewStyle,
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  } as ViewStyle,
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  } as TextStyle,
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  } as TextStyle,
  welcomeContainer: {
    marginBottom: 40,
  } as ViewStyle,
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  } as TextStyle,
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  } as TextStyle,
  roleContainer: {
    flex: 1,
  } as ViewStyle,
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  } as TextStyle,
  roleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  roleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  } as ViewStyle,
  roleTextContainer: {
    flex: 1,
    marginLeft: 16,
  } as ViewStyle,
  roleCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  } as TextStyle,
  roleCardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  } as TextStyle,
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  } as ViewStyle,
  signInText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  } as TextStyle,
  signInLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textDecorationLine: 'underline',
  } as TextStyle,
});
