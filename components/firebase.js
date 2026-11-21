
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAKXGjVJXwjzW2DjcJtMvDRikwm3Yc9wzI',
  authDomain: 'pushhub-fe172.firebaseapp.com',
  projectId: 'pushhub-fe172',
  storageBucket: 'pushhub-fe172.firebasestorage.app',
  messagingSenderId: '271413929582',
  appId: '1:271413929582:web:ea21b05a32e46aba52687f',
};

// Initialize Firebase only once
export function getFirebaseApp() {
  return getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);
}

// Firebase App
export const app = getFirebaseApp();

// Firebase Authentication
export const auth = getAuth(app);

// Cloud Firestore
export const db = getFirestore(app);

// Compatibility helpers
export const getAuthClient = () => auth;
export const getDb = () => db;

export default app;
