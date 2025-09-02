import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
