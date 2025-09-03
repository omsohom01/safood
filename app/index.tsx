"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Ionicons } from "@expo/vector-icons"
import { router, useRootNavigationState } from "expo-router"
import { useEffect, useRef } from "react"
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const { width, height } = Dimensions.get('window')

export default function WelcomeScreen() {
  const { user } = useAuth()
  const navReady = useRootNavigationState()

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const slideAnim = useRef(new Animated.Value(50)).current

  // Generate random positions for circles
  const getRandomPosition = () => ({
    startX: Math.random() * width * 2 - width, // Random X between -width and width
    startY: Math.random() * height * 2 - height, // Random Y between -height and height
    endX: Math.random() * width * 2 - width,
    endY: Math.random() * height * 2 - height,
  })

  // Background circle animations with random positions
  const circle1Pos = useRef(getRandomPosition()).current
  const circle2Pos = useRef(getRandomPosition()).current
  const circle3Pos = useRef(getRandomPosition()).current
  const circle4Pos = useRef(getRandomPosition()).current

  const circle1 = useRef(new Animated.ValueXY({ x: circle1Pos.startX, y: circle1Pos.startY })).current
  const circle2 = useRef(new Animated.ValueXY({ x: circle2Pos.startX, y: circle2Pos.startY })).current
  const circle3 = useRef(new Animated.ValueXY({ x: circle3Pos.startX, y: circle3Pos.startY })).current
  const circle4 = useRef(new Animated.ValueXY({ x: circle4Pos.startX, y: circle4Pos.startY })).current

  useEffect(() => {
    // Main content animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()

    // Background circle animations with randomized continuous movement
    const animateCircles = () => {
      const animateCircle = (circle: Animated.ValueXY, duration: number) => {
        const newPos = getRandomPosition()
        Animated.timing(circle, {
          toValue: { x: newPos.endX, y: newPos.endY },
          duration: duration + Math.random() * 5000, // Add randomness to duration
          useNativeDriver: false,
        }).start(() => {
          // When animation completes, start a new random animation
          animateCircle(circle, duration)
        })
      }

      // Start each circle with different random durations
      animateCircle(circle1, 15000)
      animateCircle(circle2, 18000)
      animateCircle(circle3, 20000)
      animateCircle(circle4, 16000)
    }

    animateCircles()
  }, [fadeAnim, scaleAnim, slideAnim, circle1, circle2, circle3, circle4])

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Animated Circles */}
      <Animated.View
        style={[
          styles.backgroundCircle,
          styles.circle1,
          {
            transform: [
              { translateX: circle1.x },
              { translateY: circle1.y }
            ]
          }
        ]}
      />
      <Animated.View
        style={[
          styles.backgroundCircle,
          styles.circle2,
          {
            transform: [
              { translateX: circle2.x },
              { translateY: circle2.y }
            ]
          }
        ]}
      />
      <Animated.View
        style={[
          styles.backgroundCircle,
          styles.circle3,
          {
            transform: [
              { translateX: circle3.x },
              { translateY: circle3.y }
            ]
          }
        ]}
      />
      <Animated.View
        style={[
          styles.backgroundCircle,
          styles.circle4,
          {
            transform: [
              { translateX: circle4.x },
              { translateY: circle4.y }
            ]
          }
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim }
            ]
          }
        ]}
      >
        {/* Brand card */}
        <View style={styles.brandCard}>
          <View style={styles.logoBadge} accessibilityRole="image" accessible accessibilityLabel="Food Rescue logo">
            <Text
              style={{
                color: "white",
                fontSize: 12,
                fontWeight: "600",
                letterSpacing: 2,
              }}
            >
              SAFOOD
            </Text>
          </View>
          <Text style={styles.brandTitle}>SaFood</Text>
          <Text style={styles.brandSubtitle}>
            Connecting excess food with those in need
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {user ? (
            // If user is logged in, show Dashboard button
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/(tabs)/home")}
              accessibilityRole="button"
              accessibilityLabel="Go to Dashboard"
            >
              <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color="white"
                style={styles.buttonIcon}
              />
            </TouchableOpacity>
          ) : (
            // If user is not logged in, show Get Started and Sign In buttons
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push("/auth/welcome")}
                accessibilityRole="button"
                accessibilityLabel="Get started with SaFood"
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="white"
                  style={styles.buttonIcon}
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push("/auth/signin")}
                accessibilityRole="button"
                accessibilityLabel="Sign in to SaFood"
              >
                <Text style={styles.secondaryButtonText}>Sign In</Text>
                <Ionicons
                  name="log-in"
                  size={20}
                  color="#22c55e"
                  style={styles.buttonIcon}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  
  // Background circles
  backgroundCircle: {
    position: "absolute",
    borderRadius: 1000,
    opacity: 0.03,
  },
  circle1: {
    width: 120,
    height: 120,
    backgroundColor: "#22c55e",
  },
  circle2: {
    width: 80,
    height: 80,
    backgroundColor: "#10b981",
  },
  circle3: {
    width: 200,
    height: 200,
    backgroundColor: "#16a34a",
  },
  circle4: {
    width: 60,
    height: 60,
    backgroundColor: "#059669",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  brandCard: {
    alignItems: "center",
    marginBottom: 80,
  },

  logoBadge: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingVertical: 36,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#22c55e",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  brandTitle: {
    fontSize: 48,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },

  brandSubtitle: {
    fontSize: 18,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 26,
    maxWidth: 300,
  },

  buttonContainer: {
    width: "100%",
    maxWidth: 300,
    gap: 16,
  },

  primaryButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#22c55e",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  primaryButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },

  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#22c55e",
  },

  secondaryButtonText: {
    color: "#22c55e",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },

  buttonIcon: {
    marginLeft: 4,
  },
})
