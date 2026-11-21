
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAKXGjVJXwjzW2DjcJtMvDRikwm3Yc9wzI',
  authDomain: 'pushhub-fe172.firebaseapp.com',
  projectId: 'pushhub-fe172',
  storageBucket: 'pushhub-fe172.firebasestorage.app',
  messagingSenderId: '271413929582',
  appId: '1:271413929582:web:ea21b05a32e46aba52687f',
};

// Lazy init: initialize Firebase only when needed.
export function getFirebaseApp() {
  return getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);
}

export const getAuthClient = () => getAuth(getFirebaseApp());

export const getDb = () => getFirestore(getFirebaseApp());
