import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

// Firebase configuration
// Using "E Vent" web app configuration
const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyAiXugYzFj5T4cG4TAd__bkzsAKRopuhuc",
  authDomain: "e-vent-aa93e.firebaseapp.com",
  projectId: "e-vent-aa93e",
  storageBucket: "e-vent-aa93e.firebasestorage.app",
  messagingSenderId: "491966036189",
  appId: "1:491966036189:web:3f1e5ff7ae9fe214d8c334", // E Vent web app
  measurementId: "G-NBTGC2332X" // E Vent web app measurement ID
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
const analytics: Analytics = getAnalytics(app);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

// Export services
export { auth, analytics, db };
export default app;
















