// Server-side verification of a Firebase ID token, with no heavy Admin SDK.
// Calls the Identity Toolkit accounts:lookup endpoint: it only succeeds for a
// genuine, unexpired token issued for this Firebase project. The web API key is
// public (it already ships in admin/firebase-config.js), so a sensible default
// is fine; override with FIREBASE_API_KEY if you prefer.

const DEFAULT_API_KEY = 'AIzaSyDdJniQizI7xp333MZ4BjrIGQCPbkQWmDA'; // shcs-2949a web key (public)

/**
 * @returns {Promise<{email?:string, localId?:string}|null>} the user, or null if invalid
 */
async function verifyIdToken(idToken, apiKey = process.env.FIREBASE_API_KEY || DEFAULT_API_KEY) {
  if (!idToken) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.users && data.users[0] ? data.users[0] : null;
  } catch {
    return null;
  }
}

module.exports = { verifyIdToken };
