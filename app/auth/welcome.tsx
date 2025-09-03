import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, ScrollView, StatusBar, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive sizing helper
const isLargeScreen = width > 768;

export default function WelcomeScreen() {
  // Animation values for smooth entrance
  const logoAnim = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.9)).current
  const contentAnim = useRef(new Animated.Value(30)).current
  const card1Anim = useRef(new Animated.Value(40)).current
  const card2Anim = useRef(new Animated.Value(40)).current
  const card3Anim = useRef(new Animated.Value(40)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  // Background animation values - More circles with randomized properties
  const backgroundAnim = useRef(new Animated.Value(0)).current
  
  // Generate random positions and sizes for circles
  const generateRandomCircle = (index: number) => ({
    x: Math.random() * width * 2 - width,
    y: Math.random() * height * 2 - height,
    size: isLargeScreen ? 
      Math.random() * 200 + 100 : // 100-300px for large screens
      Math.random() * 80 + 40,    // 40-120px for mobile
    duration: Math.random() * 15000 + 10000, // 10-25 seconds
    opacity: Math.random() * 0.03 + 0.01, // Very subtle: 0.01-0.04 opacity for pure white bg
  })

  // Create 6 floating circles with random properties
  const circles = useRef(
    Array.from({ length: 6 }, (_, i) => {
      const props = generateRandomCircle(i)
      return {
        anim: new Animated.ValueXY({ x: props.x, y: props.y }),
        size: props.size,
        duration: props.duration,
        opacity: props.opacity,
        color: ['#22c55e', '#10b981', '#16a34a', '#059669', '#047857', '#065f46'][i],
      }
    })
  ).current

  const shimmerAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    // Clean entrance animations
    Animated.sequence([
      // Logo animation
      Animated.parallel([
        Animated.timing(logoAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Content slide up
      Animated.timing(contentAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      // Staggered card animations
      Animated.stagger(100, [
        Animated.timing(card1Anim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(card2Anim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(card3Anim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start()

    // Overall fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()

    // Background gradient animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start()

    // Floating elements animation with randomized movement
    const animateFloating = () => {
      circles.forEach((circle, index) => {
        const animateCircle = () => {
          const newPos = generateRandomCircle(index)
          Animated.timing(circle.anim, {
            toValue: { x: newPos.x, y: newPos.y },
            duration: circle.duration + Math.random() * 5000, // Add more randomness
            useNativeDriver: false,
          }).start(() => {
            // When animation completes, start a new random animation
            animateCircle()
          })
        }
        // Start each circle with a slight delay
        setTimeout(() => animateCircle(), index * 500)
      })
    }

    // Shimmer effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start()

    // Logo pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start()

    animateFloating()
  }, [])

  const handleCardPress = (route: string) => {
    // Add press animation
    const scaleAnim = new Animated.Value(1)
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
    
    router.push(route as any)
  }

  return (
    <>
      {/* Set status bar to light content and hide navbar */}
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      
      <View style={styles.container}>
        {/* Background Animation Elements */}
        <Animated.View 
          style={[
            styles.backgroundGradient,
            {
              opacity: backgroundAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.02, 0.05]
              })
            }
          ]}
        />
        
        {/* Floating Background Elements - Dynamic circles */}
        {circles.map((circle, index) => (
          <Animated.View 
            key={index}
            style={[
              styles.floatingElement,
              {
                width: circle.size,
                height: circle.size,
                backgroundColor: circle.color,
                opacity: circle.opacity,
                transform: [
                  { translateX: circle.anim.x },
                  { translateY: circle.anim.y }
                ]
              }
            ]}
          />
        ))}

        {/* Shimmer Effect */}
        <Animated.View 
          style={[
            styles.shimmerOverlay,
            {
              opacity: shimmerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.03]
              })
            }
          ]}
        />

        {/* Full screen container without SafeAreaView */}
        <View style={styles.fullScreenContainer}>
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
          <Animated.View 
            style={[
              styles.content,
              { opacity: fadeAnim }
            ]}
          >
            {/* Logo Section */}
            <Animated.View 
              style={[
                styles.logoSection,
                {
                  opacity: logoAnim,
                  transform: [
                    { scale: logoScale },
                    { scale: pulseAnim }
                  ]
                }
              ]}
            >
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>S A F O O D</Text>
              </View>
              <Text style={styles.appName}>SaFood</Text>
              <Text style={styles.tagline}>Fighting hunger, reducing waste</Text>
            </Animated.View>

            {/* Get Started Section */}
            <Animated.View 
              style={[
                styles.getStartedSection,
                {
                  transform: [{ translateY: contentAnim }]
                }
              ]}
            >
              <Text style={styles.sectionHeading}>Get Started</Text>
              
              {/* Role Cards */}
              <View style={styles.roleCardsContainer}>
                <Animated.View style={{ transform: [{ translateY: card1Anim }] }}>
                  <TouchableOpacity
                    style={styles.roleCard}
                    onPress={() => handleCardPress('/auth/signup?role=donor')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons name="storefront" size={24} color="#22c55e" />
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text style={styles.roleTitle}>Food Donor</Text>
                      <Text style={styles.roleSubtitle}>Share surplus food from restaurants, stores, or homes</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={{ transform: [{ translateY: card2Anim }] }}>
                  <TouchableOpacity
                    style={styles.roleCard}
                    onPress={() => handleCardPress('/auth/signup?role=recipient')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons name="people" size={24} color="#22c55e" />
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text style={styles.roleTitle}>Food Recipient</Text>
                      <Text style={styles.roleSubtitle}>Access donated food for your community or organization</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={{ transform: [{ translateY: card3Anim }] }}>
                  <TouchableOpacity
                    style={styles.roleCard}
                    onPress={() => handleCardPress('/auth/signup?role=volunteer')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons name="bicycle" size={24} color="#22c55e" />
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text style={styles.roleTitle}>Volunteer</Text>
                      <Text style={styles.roleSubtitle}>Help deliver food from donors to recipients</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/auth/signin')}>
                <Text style={styles.signInLink}> Sign In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  } as ViewStyle,
  
  // Background animation elements
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.01)', // Very subtle for pure white bg
    zIndex: -1,
  } as ViewStyle,
  floatingElement: {
    position: 'absolute',
    borderRadius: 1000, // Large radius for perfect circles
    zIndex: -1,
    // Dynamic size and opacity will be applied inline
  } as ViewStyle,
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.005)', // Very subtle for pure white bg
    zIndex: -1,
  } as ViewStyle,
  
  fullScreenContainer: {
    flex: 1,
    paddingTop: 60, // Increased padding to ensure no navbar overlap
  } as ViewStyle,
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  } as ViewStyle,
  content: {
    flex: 1,
    justifyContent: 'space-between',
  } as ViewStyle,
  
  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 60,
  } as ViewStyle,
  logoBadge: {
    width: isLargeScreen ? 100 : 90,
    height: isLargeScreen ? 100 : 90,
    borderRadius: isLargeScreen ? 20 : 12,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#22c55e',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  } as ViewStyle,
  logoText: {
    color: '#ffffff',
    fontSize: isLargeScreen ? 10 : 10,
    fontWeight: '300',
    letterSpacing: isLargeScreen ? 2 : 2,
  } as TextStyle,
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  } as TextStyle,
  tagline: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '400',
  } as TextStyle,
  
  // Get Started Section
  getStartedSection: {
    flex: 1,
    marginBottom: 40,
  } as ViewStyle,
  sectionHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 32,
  } as TextStyle,
  
  // Role Cards
  roleCardsContainer: {
    gap: 16,
  } as ViewStyle,
  roleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  } as ViewStyle,
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  } as ViewStyle,
  cardTextContainer: {
    flex: 1,
    marginRight: 12,
  } as ViewStyle,
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  } as TextStyle,
  roleSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    fontWeight: '400',
  } as TextStyle,
  
  // Sign In
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  } as ViewStyle,
  signInText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '400',
  } as TextStyle,
  signInLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  } as TextStyle,
});
