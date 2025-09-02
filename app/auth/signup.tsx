import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';
import { UserRole } from '../../types';

export default function SignUpScreen() {
  const { role } = useLocalSearchParams<{ role: UserRole }>();
  const { signUp } = useAuth();
  
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
        router.replace('/(tabs)/home');
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
        return 'Volunteer Driver';
      default:
        return 'Sign Up';
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
    <LinearGradient colors={getRoleColor()} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Join as {getRoleTitle()}</Text>
              <Text style={styles.subtitle}>
                Create your account to start making a difference
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
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
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: '100%',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 60, // Increase bottom padding for better scrolling
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
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
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 40, // Add bottom margin for better scrolling
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  signUpButton: {
    marginTop: 24,
    marginBottom: 20,
  },
  signInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  signInButton: {
    borderColor: '#22c55e',
    paddingHorizontal: 16,
  },
});
