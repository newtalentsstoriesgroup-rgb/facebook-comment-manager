import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { logActivity } from '@/lib/activity';

const AuthContext = createContext(null);

// Irema ko inyandiko y'umukoresha (users/{uid}) ibaho; iyo itabaho iyirema.
const inFlight = new Map();

// Ikumira ihamagarwa kabiri (register + onAuthStateChanged) ntikirema inyandiko kabiri.
function ensureUserProfile(user, displayNameOverride) {
  if (inFlight.has(user.uid)) return inFlight.get(user.uid);
  const p = createProfileIfMissing(user, displayNameOverride).finally(() =>
    inFlight.delete(user.uid)
  );
  inFlight.set(user.uid, p);
  return p;
}

async function createProfileIfMissing(user, displayNameOverride) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const profile = {
    uid: user.uid,
    email: user.email || '',
    displayName: displayNameOverride || user.displayName || null,
    photoURL: user.photoURL || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return { ...profile, createdAt: new Date(), updatedAt: new Date() };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Gukomeza kwinjira (persistence) mu mushakisha
    setPersistence(auth, browserLocalPersistence).catch((e) =>
      console.error('[auth] persistence', e)
    );

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const p = await ensureUserProfile(firebaseUser);
          setProfile(p);
        } catch (err) {
          console.error('[auth] profile', err);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    const p = await ensureUserProfile(cred.user, displayName);
    setUser(cred.user);
    setProfile(p);
    await logActivity(cred.user.uid, 'account_created', 'Yaremye konti.');
    return cred.user;
  }, []);

  const login = useCallback(async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const resetPassword = useCallback((email) => sendPasswordResetEmail(auth, email), []);

  const updateUserProfile = useCallback(
    async ({ displayName, photoURL }) => {
      if (!auth.currentUser) throw new Error('Ntabwo winjiye.');
      const patch = {
        displayName: displayName?.trim() || null,
        photoURL: photoURL?.trim() || null,
      };
      await updateProfile(auth.currentUser, {
        displayName: patch.displayName,
        photoURL: patch.photoURL,
      });
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
      setProfile((prev) => ({ ...(prev || {}), ...patch }));
      await logActivity(auth.currentUser.uid, 'profile_updated', 'Yahinduye umwirondoro.');
    },
    []
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      register,
      login,
      logout,
      resetPassword,
      updateUserProfile,
    }),
    [user, profile, loading, register, login, logout, resetPassword, updateUserProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth igomba gukoreshwa imbere ya <AuthProvider>.');
  return ctx;
}

export default AuthContext;
