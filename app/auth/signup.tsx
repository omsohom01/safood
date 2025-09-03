import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

const { width, height } = Dimensions.get('window');

export default function SignUpScreen() {
  const { role } = useLocalSearchParams<{ role: UserRole }>();
  const { signUp } = useAuth();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerAnim = useRef(new Animated.Value(-30)).current;
  const formAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  // Background floating circles
  const circles = useRef(
    Array.from({ length: 5 }, (_, i) => ({
      anim: new Animated.ValueXY({
        x: Math.random() * width,
        y: Math.random() * height,
      }),
      size: Math.random() * 60 + 30,
      opacity: Math.random() * 0.05 + 0.02,
      color: ['#22c55e', '#10b981', '#16a34a', '#059669', '#047857'][i],
    }))
  ).current;
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    organizationName: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Entrance animations
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(headerAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(formAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Background animations
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
    ).start();

    // Shimmer effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating circles animation
    circles.forEach((circle, index) => {
      const animateCircle = () => {
        Animated.timing(circle.anim, {
          toValue: {
            x: Math.random() * width,
            y: Math.random() * height,
          },
          duration: 8000 + Math.random() * 4000,
          useNativeDriver: false,
        }).start(() => animateCircle());
      };
      setTimeout(() => animateCircle(), index * 1000);
    });
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (role === 'ngo' && !formData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await signUp(formData.email, formData.password, {
        name: formData.name,
        role: role || 'donor',
        phone: formData.phone,
        address: formData.address,
        organizationName: formData.organizationName,
      });
      
      // Redirect volunteers to NGO selection, others to home
      if (role === 'volunteer') {
        router.replace('/auth/volunteer-setup');
      } else {
  router.replace('/home');
      }
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const getRoleTitle = () => {
    switch (role) {
      case 'donor':
        return 'Food Donor';
      case 'ngo':
        return 'NGO/Charity';
      case 'volunteer':
        return 'Volunteer';
      default:
        return 'Food Recipient';
    }
  };

  const getRoleColor = (): [string, string] => {
    switch (role) {
      case 'donor':
        return ['#22c55e', '#16a34a'];
      case 'ngo':
        return ['#f97316', '#ea580c'];
      case 'volunteer':
        return ['#3b82f6', '#2563eb'];
      default:
        return ['#22c55e', '#16a34a'];
    }
  };

  return (
    <>
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
        
        {/* Floating Background Circles */}
        {circles.map((circle, index) => (
          <Animated.View 
            key={index}
            style={[
              styles.floatingCircle,
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

        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.content}>
                {/* Header */}
                <Animated.View 
                  style={[
                    styles.header,
                    { transform: [{ translateY: headerAnim }] }
                  ]}
                >
                  <View style={styles.headerBadge}>
                    <Text style={styles.badgeText}>{getRoleTitle()}</Text>
                  </View>
                  <Text style={styles.title}>Create Your Account</Text>
                  <Text style={styles.subtitle}>
                    Join our community and start making a difference
                  </Text>
                </Animated.View>

                {/* Form */}
                <Animated.View 
                  style={[
                    styles.form,
                    { transform: [{ translateY: formAnim }] }
                  ]}
                >
              <InputField
                label="Full Name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                error={errors.name}
                leftIcon="person-outline"
                placeholder="Enter your full name"
                containerStyle={styles.inputContainer}
              />

              <InputField
                label="Email Address"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                error={errors.email}
                leftIcon="mail-outline"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                containerStyle={styles.inputContainer}
              />

              <InputField
                label="Password"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                error={errors.password}
                leftIcon="lock-closed-outline"
                placeholder="Create a password"
                secureTextEntry
                containerStyle={styles.inputContainer}
              />

              <InputField
                label="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                error={errors.confirmPassword}
                leftIcon="lock-closed-outline"
                placeholder="Confirm your password"
                secureTextEntry
                containerStyle={styles.inputContainer}
              />

              <InputField
                label="Phone Number (Optional)"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                leftIcon="call-outline"
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                containerStyle={styles.inputContainer}
              />

              <InputField
                label="Address (Optional)"
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                leftIcon="location-outline"
                placeholder="Enter your address"
                containerStyle={styles.inputContainer}
              />

              {role === 'ngo' && (
                <InputField
                  label="Organization Name"
                  value={formData.organizationName}
                  onChangeText={(text) => setFormData({ ...formData, organizationName: text })}
                  error={errors.organizationName}
                  leftIcon="business-outline"
                  placeholder="Enter organization name"
                  containerStyle={styles.inputContainer}
                />
              )}

              <Button
                title="Create Account"
                onPress={handleSignUp}
                loading={loading}
                size="large"
                style={styles.signUpButton}
              />

              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account?</Text>
                <Button
                  title="Sign In"
                  onPress={() => router.push('/auth/signin')}
                  variant="outline"
                  size="small"
                  style={styles.signInButton}
                />
              </View>
                </Animated.View>
              </View>
            </ScrollView>
          </Animated.View>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  
  // Background animation elements
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.01)',
    zIndex: -1,
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 1000,
    zIndex: -1,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.005)',
    zIndex: -1,
  },
  
  safeArea: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: '100%',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#22c55e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  inputContainer: {
    marginBottom: 20,
  },
  signUpButton: {
    marginTop: 28,
    marginBottom: 24,
    backgroundColor: '#22c55e',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#22c55e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  signInText: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
    fontWeight: '400',
  },
  signInButton: {
    borderColor: '#22c55e',
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
});
