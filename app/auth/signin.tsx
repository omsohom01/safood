import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';
import { useAuth } from '../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function SignInScreen() {
  const { signIn } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(-30)).current;
  const formAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  const circles = useRef(
    Array.from({ length: 5 }, (_, i) => ({
      anim: new Animated.ValueXY({ x: Math.random()*width, y: Math.random()*height }),
      size: Math.random()*60+30,
      opacity: Math.random()*0.05+0.02,
      color: ['#22c55e','#10b981','#16a34a','#059669','#047857'][i],
    }))
  ).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim,{ toValue:1, duration:800, useNativeDriver:true }),
        Animated.timing(headerAnim,{ toValue:0, duration:600, useNativeDriver:true }),
      ]),
      Animated.timing(formAnim,{ toValue:0, duration:500, useNativeDriver:true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundAnim,{ toValue:1, duration:4000, useNativeDriver:true }),
        Animated.timing(backgroundAnim,{ toValue:0, duration:4000, useNativeDriver:true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim,{ toValue:1, duration:3000, useNativeDriver:true }),
        Animated.timing(shimmerAnim,{ toValue:0, duration:3000, useNativeDriver:true }),
      ])
    ).start();

    circles.forEach((c,i)=>{ setTimeout(function animate(){
        Animated.timing(c.anim,{ toValue:{x:Math.random()*width,y:Math.random()*height},
          duration:8000+Math.random()*4000, useNativeDriver:false})
        .start(animate);
      }, i*500);
    });
  },[]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await signIn(formData.email, formData.password);
  router.replace('/home');
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      <View style={styles.container}>
        <Animated.View style={[styles.backgroundGradient,{ opacity: backgroundAnim.interpolate({ inputRange:[0,1],outputRange:[0.02,0.05] }) }]} />
        {circles.map((c,i)=><Animated.View key={i} style={[styles.floatingCircle,{ width:c.size,height:c.size,backgroundColor:c.color,opacity:c.opacity,transform:[{ translateX:c.anim.x},{ translateY:c.anim.y}]}]} />)}
        <Animated.View style={[styles.shimmerOverlay,{ opacity: shimmerAnim.interpolate({ inputRange:[0,1],outputRange:[0,0.03] }) }]} />
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.animatedContainer,{ opacity:fadeAnim }]}>          
            <Animated.View style={[styles.header,{ transform:[{ translateY: headerAnim }] }]}>  
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue making a difference</Text>
            </Animated.View>
            <Animated.View style={[styles.form,{ transform:[{ translateY: formAnim }] }]}>          
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
                placeholder="Enter your password"
                secureTextEntry
                containerStyle={styles.inputContainer}
              />

              <Button
                title="Sign In"
                onPress={handleSignIn}
                loading={loading}
                size="large"
                style={styles.signInButton}
              />

              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don't have an account?</Text>
                <Button
                  title="Sign Up"
                  onPress={() => router.push('/auth/welcome')}
                  variant="outline"
                  size="small"
                  style={styles.signUpButton}
                />
              </View>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#ffffff', overflow:'hidden' },
  backgroundGradient:{ position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(34,197,94,0.01)',zIndex:-1 },
  floatingCircle:{ position:'absolute',borderRadius:1000,zIndex:-1 },
  shimmerOverlay:{ position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(34,197,94,0.005)',zIndex:-1 },
  safeArea:{ flex:1 },
  animatedContainer:{ flex:1, justifyContent:'center', paddingHorizontal:24 },
  header:{ alignItems:'center', marginBottom:40 },
  title:{ fontSize:32,fontWeight:'700',color:'#111827',textAlign:'center', marginBottom:8 },
  subtitle:{ fontSize:16,color:'#6b7280',textAlign:'center',lineHeight:24,marginBottom:24 },
  form:{ backgroundColor:'#ffffff', borderRadius:24, padding:28, shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.1,shadowRadius:12,elevation:8 },
  inputContainer: {
    marginBottom: 16,
  },
  signInButton: {
    marginTop: 24,
    marginBottom: 20,
  },
  signUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  signUpButton: {
    borderColor: '#22c55e',
    paddingHorizontal: 16,
  },
});
