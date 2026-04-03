import admin from 'firebase-admin';

import { env } from '@/lib/env';

function initializeFirebaseAdmin(): void {
  if (admin.apps.length > 0) {
    return;
  }

  const projectId = env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    const serviceAccount: admin.ServiceAccount = {
      projectId,
      clientEmail,
      privateKey,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
    return;
  }

  // Fallback to default credentials for local/dev or platform-provided credentials.
  admin.initializeApp({
    projectId,
  });
}

initializeFirebaseAdmin();

export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();

export default admin;
