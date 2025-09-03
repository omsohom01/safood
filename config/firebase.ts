import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyARjlAL62wIsnfY-TXOdD31iYzfDBKDhao",
  authDomain: "safood-27de4.firebaseapp.com",
  projectId: "safood-27de4",
  storageBucket: "safood-27de4.firebasestorage.app",
  messagingSenderId: "540774757819",
  appId: "1:540774757819:web:5d5463d4d638c0bc33409e",
  measurementId: "G-NF1RD3KXEQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence on native; fallback to getAuth on web
// Important: Do NOT call getAuth before initializeAuth on native
let auth: Auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  // Native (Android/iOS): initialize with AsyncStorage-backed persistence
  try {
    // Use RN-specific entrypoint to avoid type issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getReactNativePersistence } = require('firebase/auth/react-native');
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    // If already initialized or RN entrypoint unavailable, fall back gracefully
    try {
      auth = getAuth(app);
    } catch {
      auth = initializeAuth(app, {} as any);
    }
  }
}

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
