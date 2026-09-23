import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA2AKJkumXAyXwWKuc1RdGvq3rVHuQTeJQ',
  authDomain: 'baby-io-80d95.firebaseapp.com',
  projectId: 'baby-io-80d95',
  storageBucket: 'baby-io-80d95.firebasestorage.app',
  messagingSenderId: '368049275806',
  appId: '1:368049275806:web:3f8c2613e678401f948c8f',
  measurementId: 'G-720628K5S2',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
