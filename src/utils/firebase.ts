import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  addDoc, 
  deleteDoc, 
  getDocs,
  Timestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Permanent Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9Figy122V0US8dg-u88X7m_k2ErgB4a0",
  authDomain: "riddimroom-publisher-ai.firebaseapp.com",
  projectId: "riddimroom-publisher-ai",
  storageBucket: "riddimroom-publisher-ai.firebasestorage.app",
  messagingSenderId: "1093295215659",
  appId: "1:1093295215659:web:a6f2533fb4e1e66504866e",
  measurementId: "G-1FG96HJ5Y8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export interface FirestoreUserData {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: string;
  lastLogin: string;
  plan: 'Free' | 'Creator' | 'Publisher' | 'Admin';
  enabled: boolean;
  role: 'user' | 'admin';
  booksCreated: number;
  booksDownloaded: number;
  lastActivity: string;
  notes: string;
  usage: number;
}

export interface FirestoreActivityLog {
  id?: string;
  timestamp: string;
  uid: string;
  email: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  category: string;
  ip?: string;
}

// Check if user is the primary admin
export function isPrimaryAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === 'ramjitinvestments@gmail.com';
}

// Log an activity directly to Firestore
export async function logActivity(
  uid: string, 
  email: string, 
  level: 'info' | 'warn' | 'error', 
  message: string, 
  category: string
) {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      timestamp: new Date().toISOString(),
      uid,
      email,
      level,
      message,
      category,
      ip: '127.0.0.1' // client-side fallback
    });
  } catch (err) {
    console.error('Error writing activity log to Firestore:', err);
  }
}

// Synchronize or create user document in Firestore
export async function syncUserInFirestore(user: FirebaseUser, forcePlan?: 'Free' | 'Creator' | 'Publisher' | 'Admin'): Promise<FirestoreUserData> {
  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);
  const nowStr = new Date().toISOString();
  
  const isPrimaryAdmin = isPrimaryAdminEmail(user.email);
  
  if (!userDoc.exists()) {
    // New user signup
    const newUserData: FirestoreUserData = {
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
      createdAt: nowStr,
      lastLogin: nowStr,
      plan: forcePlan || (isPrimaryAdmin ? 'Admin' : 'Free'),
      enabled: true,
      role: isPrimaryAdmin ? 'admin' : 'user',
      booksCreated: 0,
      booksDownloaded: 0,
      lastActivity: nowStr,
      notes: '',
      usage: 0
    };
    
    await setDoc(userDocRef, newUserData);
    await logActivity(user.uid, user.email || '', 'info', `New user registered: ${user.email}`, 'auth');
    return newUserData;
  } else {
    // Returning user login
    const existingData = userDoc.data() as FirestoreUserData;
    const updateData: Partial<FirestoreUserData> = {
      lastLogin: nowStr,
      lastActivity: nowStr,
    };
    
    // Auto-escalate Ramjit to Admin/Admin Role if somehow modified
    if (isPrimaryAdmin && (existingData.role !== 'admin' || existingData.plan !== 'Admin')) {
      updateData.role = 'admin';
      updateData.plan = 'Admin';
    }

    if (forcePlan) {
      updateData.plan = forcePlan;
    }
    
    await updateDoc(userDocRef, updateData);
    await logActivity(user.uid, user.email || '', 'info', `User signed in: ${user.email}`, 'auth');
    return {
      ...existingData,
      ...updateData
    } as FirestoreUserData;
  }
}
