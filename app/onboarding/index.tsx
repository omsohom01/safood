import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: 1,
    title: "Fight Food Waste",
    subtitle: "Connect surplus food with those who need it most",
    description: "Join the mission to reduce food waste by connecting donors with NGOs and volunteers for quick pickup and delivery.",
    image: require('../../assets/images/react-logo.png'), // Replace with actual onboarding images
    bgColors: ['#22c55e', '#16a34a'] as [string, string],
  },
  {
    id: 2,
    title: "Real-time Coordination",
    subtitle: "Instant notifications and live tracking",
    description: "Get notified immediately when food donations are available. Track pickups and deliveries in real-time.",
    image: require('../../assets/images/react-logo.png'),
    bgColors: ['#f97316', '#ea580c'] as [string, string],
  },
  {
    id: 3,
    title: "Make an Impact",
    subtitle: "Every meal saved matters",
    description: "Track your impact with detailed analytics. See how many meals you've saved and lives you've touched.",
    image: require('../../assets/images/react-logo.png'),
    bgColors: ['#3b82f6', '#2563eb'] as [string, string],
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace('/auth/welcome');
    }
  };

  const skipOnboarding = () => {
    router.replace('/auth/welcome');
  };

  const currentSlide = onboardingData[currentIndex];

  return (
    <LinearGradient
      colors={currentSlide.bgColors}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Skip Button */}
          <View style={styles.skipContainer}>
            <TouchableOpacity
              onPress={skipOnboarding}
              style={styles.skipButton}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.mainContent}>
            {/* Image */}
            <View style={styles.imageContainer}>
              <Image
                source={currentSlide.image}
                style={styles.image}
                resizeMode="contain"
              />
            </View>

            {/* Text Content */}
            <View style={styles.textContent}>
              <Text style={styles.title}>
                {currentSlide.title}
              </Text>
              <Text style={styles.subtitle}>
                {currentSlide.subtitle}
              </Text>
              <Text style={styles.description}>
                {currentSlide.description}
              </Text>
            </View>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            {/* Pagination Dots */}
            <View style={styles.pagination}>
              {onboardingData.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentIndex ? styles.activeDot : styles.inactiveDot
                  ]}
                />
              ))}
            </View>

            {/* Next Button */}
            <TouchableOpacity
              onPress={nextSlide}
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </TouchableOpacity>
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
    paddingHorizontal: 24,
  },
  skipContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 16,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  image: {
    width: 240,
    height: 240,
  },
  textContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSection: {
    paddingBottom: 32,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#ffffff',
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  nextButton: {
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingVertical: 16,
    marginHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
});
