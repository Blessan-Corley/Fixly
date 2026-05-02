/**
 * Playwright E2E test database seed script.
 *
 * Seeds the MongoDB test database with the exact documents that match the
 * constants declared in tests/e2e/helpers/api-mocks.ts. Run this before
 * Playwright CI against a real (non-mocked) database.
 *
 * Usage:
 *   npx tsx scripts/seed-test-db.ts
 *   # or with a custom URI:
 *   MONGODB_URI=mongodb://localhost/fixly_test npx tsx scripts/seed-test-db.ts
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import mongoose, { Types } from 'mongoose';

// ---------------------------------------------------------------------------
// Load .env.local so the script can run standalone (outside Next.js)
// ---------------------------------------------------------------------------
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const rawVal = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = rawVal;
  }
}

// ---------------------------------------------------------------------------
// Fixed ObjectIDs — must match tests/e2e/helpers/api-mocks.ts
// ---------------------------------------------------------------------------
const HIRER_ID = new Types.ObjectId('507f1f77bcf86cd799439011');
const FIXER_ID = new Types.ObjectId('507f1f77bcf86cd799439022');
const JOB_ID = new Types.ObjectId('507f1f77bcf86cd799439033');
const APP_ID = new Types.ObjectId('507f1f77bcf86cd799439044');
const CONVERSATION_ID = new Types.ObjectId('507f1f77bcf86cd799439055');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hashPassword(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

const futureDate = (daysFromNow: number): Date =>
  new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);

// ---------------------------------------------------------------------------
// Seed payloads
// ---------------------------------------------------------------------------
const testHirer = {
  _id: HIRER_ID,
  name: 'Test Hirer',
  email: 'test-hirer@fixly-e2e.test',
  username: 'testhirere2e',
  authMethod: 'email' as const,
  providers: ['email'],
  role: 'hirer' as const,
  isRegistered: true,
  isActive: true,
  banned: false,
  suspended: false,
  emailVerified: true,
  phoneVerified: false,
  passwordHash: hashPassword('e2e-test-password'),
  plan: { type: 'free', status: 'active', creditsUsed: 0 },
  rating: { average: 4.5, count: 10 },
  jobsPosted: 1,
  jobsCompleted: 0,
  totalEarnings: 0,
  skills: [] as string[],
  availableNow: false,
  serviceRadius: 10,
  verification: { status: 'approved' },
  privacy: {
    profileVisibility: 'public',
    showPhone: false,
    showEmail: false,
    showLocation: true,
    showRating: true,
    allowReviews: true,
    allowMessages: true,
    dataSharingConsent: false,
  },
  preferences: {
    theme: 'light',
    language: 'en',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    emailNotifications: true,
    pushNotifications: true,
  },
};

const testFixer = {
  _id: FIXER_ID,
  name: 'Test Fixer',
  email: 'test-fixer@fixly-e2e.test',
  username: 'testfixere2e',
  authMethod: 'email' as const,
  providers: ['email'],
  role: 'fixer' as const,
  isRegistered: true,
  isActive: true,
  banned: false,
  suspended: false,
  emailVerified: true,
  phoneVerified: false,
  passwordHash: hashPassword('e2e-test-password'),
  plan: { type: 'free', status: 'active', creditsUsed: 0 },
  rating: { average: 4.8, count: 20 },
  jobsPosted: 0,
  jobsCompleted: 5,
  totalEarnings: 22500,
  skills: ['plumbing', 'carpentry'],
  availableNow: true,
  serviceRadius: 15,
  verification: { status: 'approved' },
  privacy: {
    profileVisibility: 'public',
    showPhone: false,
    showEmail: false,
    showLocation: true,
    showRating: true,
    allowReviews: true,
    allowMessages: true,
    dataSharingConsent: false,
  },
  preferences: {
    theme: 'light',
    language: 'en',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    emailNotifications: true,
    pushNotifications: true,
  },
};

const testJob = {
  _id: JOB_ID,
  title: 'Fix plumbing issue',
  description:
    'The kitchen pipe is leaking badly and needs urgent repair by an experienced plumber.',
  type: 'one-time',
  urgency: 'asap',
  status: 'open',
  createdBy: HIRER_ID,
  assignedTo: null,
  skillsRequired: ['plumbing'],
  experienceLevel: 'intermediate',
  budget: { type: 'fixed', amount: 5000, currency: 'INR', materialsIncluded: false },
  location: {
    address: '12 Marine Drive',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    lat: 19.07,
    lng: 72.87,
  },
  deadline: futureDate(7),
  applications: [
    {
      _id: APP_ID,
      fixer: FIXER_ID,
      proposedAmount: 4500,
      timeEstimate: { value: 3, unit: 'hours' },
      description: 'I am experienced in plumbing and can fix this quickly.',
      status: 'pending',
      appliedAt: new Date(),
    },
  ],
  views: { count: 5, uniqueViewers: [] },
  likes: { count: 0, likedBy: [] },
  featured: false,
};

const testConversation = {
  _id: CONVERSATION_ID,
  participants: [HIRER_ID, FIXER_ID],
  relatedJob: JOB_ID,
  conversationType: 'job',
  archived: false,
  muted: false,
  lastActivity: new Date(),
  lastMessage: {
    content: 'Hello! I saw your job posting.',
    sender: FIXER_ID,
    messageType: 'text',
    timestamp: new Date(),
  },
  messages: [
    {
      sender: FIXER_ID,
      content: 'Hello! I saw your job posting.',
      messageType: 'text',
      timestamp: new Date(),
      read: true,
    },
  ],
  metadata: {
    totalMessages: 1,
    createdBy: FIXER_ID,
    priority: 'normal',
  },
};

// ---------------------------------------------------------------------------
// E2E test user IDs that must be wiped on each seed run
// ---------------------------------------------------------------------------
const TEST_USER_IDS = [HIRER_ID, FIXER_ID];
const TEST_EMAILS = ['test-hirer@fixly-e2e.test', 'test-fixer@fixly-e2e.test'];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seed(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌  MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  console.log('🌱  Connecting to MongoDB…');
  await mongoose.connect(uri);
  console.log('✅  Connected.');

  const db = mongoose.connection.db;
  if (!db) throw new Error('No db connection');

  // Collections
  const users = db.collection('users');
  const jobs = db.collection('jobs');
  const conversations = db.collection('conversations');

  // ------------------------------------------------------------------
  // Wipe existing test fixtures so repeated runs are idempotent
  // ------------------------------------------------------------------
  console.log('🗑   Removing stale test fixtures…');
  await Promise.all([
    users.deleteMany({ $or: [{ _id: { $in: TEST_USER_IDS } }, { email: { $in: TEST_EMAILS } }] }),
    jobs.deleteMany({ _id: JOB_ID }),
    conversations.deleteMany({ _id: CONVERSATION_ID }),
  ]);

  // ------------------------------------------------------------------
  // Insert fresh fixtures
  // ------------------------------------------------------------------
  console.log('📦  Inserting test users…');
  await users.insertMany([testHirer, testFixer]);

  console.log('📦  Inserting test job…');
  await jobs.insertOne(testJob);

  console.log('📦  Inserting test conversation…');
  await conversations.insertOne(testConversation);

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  console.log('\n✅  Seed complete!');
  console.log(`   Hirer   → ${HIRER_ID.toHexString()}  (test-hirer@fixly-e2e.test)`);
  console.log(`   Fixer   → ${FIXER_ID.toHexString()}  (test-fixer@fixly-e2e.test)`);
  console.log(`   Job     → ${JOB_ID.toHexString()}`);
  console.log(`   App     → ${APP_ID.toHexString()}  (embedded in job.applications)`);
  console.log(`   Convo   → ${CONVERSATION_ID.toHexString()}`);

  await mongoose.disconnect();
  console.log('\n👋  Disconnected. Done.');
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
