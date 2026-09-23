import { Injectable, signal } from '@angular/core';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { firebaseAuth } from './firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(firebaseAuth.currentUser);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    onAuthStateChanged(firebaseAuth, (user) => {
      this.user.set(user);
      this.isLoading.set(false);
    });
  }

  async signIn(): Promise<void> {
    this.error.set(null);
    try {
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
    } catch (error) {
      this.error.set(this.messageFor(error));
    }
  }

  async signOut(): Promise<void> {
    await signOut(firebaseAuth);
  }

  private messageFor(error: unknown): string {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code === 'auth/configuration-not-found') {
      return 'Google sign-in is not enabled for this Firebase project yet.';
    }
    if (code === 'auth/unauthorized-domain') {
      return 'This development domain is not authorized in Firebase Authentication.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'The sign-in window was closed before sign-in completed.';
    }
    return 'Google sign-in could not be completed. Check the Firebase Authentication settings.';
  }
}
