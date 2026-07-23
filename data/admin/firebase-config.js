// ─────────────────────────────────────────────────────────────────────────────
//  Firebase configuration
//  Paste the config object from your Firebase project here.
//  (Firebase console → Project settings → Your apps → SDK setup and configuration)
//
//  These values are NOT secret — Firebase web config is meant to live in the
//  browser. Access is controlled by Firebase Auth + your security rules.
//
//  Auth used: Email/Password. In the Firebase console enable
//  Authentication → Sign-in method → Email/Password, then add admin users
//  under Authentication → Users.
// ─────────────────────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: 'AIzaSyDdJniQizI7xp333MZ4BjrIGQCPbkQWmDA',
  authDomain: 'shcs-2949a.firebaseapp.com',
  projectId: 'shcs-2949a',
  storageBucket: 'shcs-2949a.firebasestorage.app',
  messagingSenderId: '807765083778',
  appId: '1:807765083778:web:bf144b7ea2a1dd5df9d69b',
  measurementId: 'G-K2RGNGLG72',
};

// Leave this as-is. app.js uses it to detect whether real config has been added.
export const isFirebaseConfigured = () =>
  !Object.values(firebaseConfig).some((v) => String(v).startsWith('YOUR_'));
