import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence, Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  increment,
  writeBatch
} from 'firebase/firestore';
import { UserProfile, Deck, FlashcardDocument, Flashcard } from '../types';

// Firebase configuration from environment
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Check if credentials are valid (i.e. not empty and not the placeholder)
const isFirebaseConfigured =
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY_HERE' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'YOUR_FIREBASE_PROJECT_ID_HERE';

let app: any = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let useMockDB = !isFirebaseConfigured;

if (!useMockDB) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
      db = getFirestore(app);
      console.log('Firebase initialized successfully.');
    } else {
      app = getApp();
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
      db = getFirestore(app);
    }
  } catch (error) {
    console.error('Firebase initialization failed, falling back to Mock DB Mode:', error);
    useMockDB = true;
  }
} else {
  console.log('Using AsyncStorage Mock DB Mode (Firebase keys not configured).');
}

export { auth, db, useMockDB };

// ==========================================
// MOCK DATABASE & AUTH LAYER (AsyncStorage)
// ==========================================

const MOCK_STORAGE_KEYS = {
  USERS: '@recall_rays_users',
  DECKS: '@recall_rays_decks',
  CARDS: '@recall_rays_cards',
  CURRENT_USER: '@recall_rays_current_user'
};

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Standard mock storage functions
async function getStorageData<T>(key: string): Promise<T[]> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveStorageData<T>(key: string, data: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

// ==========================================
// UNIFIED API METHODS (Firestore & Mock DB)
// ==========================================

// 1. Authentication helpers
export interface UserSession {
  uid: string;
  email: string;
  displayName: string;
}

export async function loginUser(email: string, password: string): Promise<UserSession> {
  if (!useMockDB && auth) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email || '',
      displayName: userCredential.user.displayName || email.split('@')[0]
    };
  } else {
    // Mock authentication
    const users = await getStorageData<UserProfile>(MOCK_STORAGE_KEYS.USERS);
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!existing) {
      throw new Error('User not found. Please register first.');
    }
    const session = { uid: existing.uid, email: existing.email, displayName: existing.displayName };
    await AsyncStorage.setItem(MOCK_STORAGE_KEYS.CURRENT_USER, JSON.stringify(session));
    return session;
  }
}

export async function registerUser(email: string, password: string, displayName: string): Promise<UserSession> {
  if (!useMockDB && auth && db) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Save profile to Firestore
    const profile: UserProfile = {
      uid,
      email,
      displayName,
      subscriptionTier: 'free',
      aiGenerationsUsedToday: 0,
      createdAt: Date.now()
    };
    await setDoc(doc(db!, 'users', uid), profile);
    return { uid, email, displayName };
  } else {
    // Mock Registration
    const users = await getStorageData<UserProfile>(MOCK_STORAGE_KEYS.USERS);
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email already registered.');
    }
    const uid = generateId();
    const newUser: UserProfile = {
      uid,
      email,
      displayName,
      subscriptionTier: 'free',
      aiGenerationsUsedToday: 0,
      createdAt: Date.now()
    };
    users.push(newUser);
    await saveStorageData(MOCK_STORAGE_KEYS.USERS, users);

    const session = { uid, email, displayName };
    await AsyncStorage.setItem(MOCK_STORAGE_KEYS.CURRENT_USER, JSON.stringify(session));
    return session;
  }
}

export async function logoutUser(): Promise<void> {
  if (!useMockDB && auth) {
    await signOut(auth);
  } else {
    await AsyncStorage.removeItem(MOCK_STORAGE_KEYS.CURRENT_USER);
  }
}

export async function getCurrentUserSession(): Promise<UserSession | null> {
  if (!useMockDB && auth) {
    const user = auth.currentUser;
    if (user) {
      return {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User'
      };
    }
    return null;
  } else {
    const data = await AsyncStorage.getItem(MOCK_STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  }
}

// 2. User Profile Operations
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!useMockDB && db) {
    const userDoc = await getDoc(doc(db!, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } else {
    const users = await getStorageData<UserProfile>(MOCK_STORAGE_KEYS.USERS);
    return users.find(u => u.uid === uid) || null;
  }
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  if (!useMockDB && db) {
    await updateDoc(doc(db!, 'users', uid), updates);
  } else {
    const users = await getStorageData<UserProfile>(MOCK_STORAGE_KEYS.USERS);
    const index = users.findIndex(u => u.uid === uid);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      await saveStorageData(MOCK_STORAGE_KEYS.USERS, users);
    }
  }
}

// 3. Decks Operations
export async function getUserDecks(userId: string): Promise<Deck[]> {
  if (!useMockDB && db) {
    const decksRef = collection(db!, 'decks');
    const q = query(decksRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    const decks: Deck[] = [];
    snap.forEach((doc) => {
      decks.push({ id: doc.id, ...doc.data() } as Deck);
    });
    // Sort in memory to avoid requiring a composite index in Cloud Firestore
    return decks.sort((a, b) => b.createdAt - a.createdAt);
  } else {
    const decks = await getStorageData<Deck>(MOCK_STORAGE_KEYS.DECKS);
    return decks
      .filter(d => d.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}

export async function createDeck(userId: string, title: string, description?: string): Promise<Deck> {
  const newDeck: Omit<Deck, 'id'> = {
    userId,
    title,
    description: description || '',
    cardCount: 0,
    lastReviewedAt: null,
    createdAt: Date.now()
  };

  if (!useMockDB && db) {
    const newDocRef = doc(collection(db!, 'decks'));
    const deck: Deck = { id: newDocRef.id, ...newDeck };
    await setDoc(newDocRef, deck);
    return deck;
  } else {
    const decks = await getStorageData<Deck>(MOCK_STORAGE_KEYS.DECKS);
    const deck: Deck = { id: generateId(), ...newDeck };
    decks.push(deck);
    await saveStorageData(MOCK_STORAGE_KEYS.DECKS, decks);
    return deck;
  }
}

// 4. Flashcards Operations
export async function getDeckFlashcards(deckId: string): Promise<FlashcardDocument[]> {
  if (!useMockDB && db) {
    const cardsRef = collection(db!, 'flashcards');
    const q = query(cardsRef, where('deckId', '==', deckId));
    const snap = await getDocs(q);
    const cards: FlashcardDocument[] = [];
    snap.forEach((doc) => {
      cards.push({ id: doc.id, ...doc.data() } as FlashcardDocument);
    });
    return cards;
  } else {
    const cards = await getStorageData<FlashcardDocument>(MOCK_STORAGE_KEYS.CARDS);
    return cards.filter(c => c.deckId === deckId);
  }
}

export async function addFlashcardsToDeck(deckId: string, userId: string, cards: Flashcard[]): Promise<void> {
  if (!useMockDB && db) {
    const batch = writeBatch(db!);

    // Add each card
    cards.forEach((card) => {
      const cardRef = doc(collection(db!, 'flashcards'));
      const newCard: FlashcardDocument = {
        id: cardRef.id,
        deckId,
        userId,
        question: card.question,
        answer: card.answer,
        intervalDays: 1, // Start Leitner at day 1
        easeFactor: 2.5, // Default difficulty
        nextReviewDate: Date.now() // Reviewable immediately
      };
      batch.set(cardRef, newCard);
    });

    // Update card count in the deck
    const deckRef = doc(db!, 'decks', deckId);
    batch.update(deckRef, {
      cardCount: increment(cards.length)
    });

    await batch.commit();
  } else {
    const allCards = await getStorageData<FlashcardDocument>(MOCK_STORAGE_KEYS.CARDS);

    cards.forEach((card) => {
      const newCard: FlashcardDocument = {
        id: generateId(),
        deckId,
        userId,
        question: card.question,
        answer: card.answer,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: Date.now()
      };
      allCards.push(newCard);
    });
    await saveStorageData(MOCK_STORAGE_KEYS.CARDS, allCards);

    // Update deck card count
    const decks = await getStorageData<Deck>(MOCK_STORAGE_KEYS.DECKS);
    const deckIndex = decks.findIndex(d => d.id === deckId);
    if (deckIndex !== -1) {
      decks[deckIndex].cardCount += cards.length;
      await saveStorageData(MOCK_STORAGE_KEYS.DECKS, decks);
    }
  }
}

// Leitner Spaced Repetition Algorithm Implementation
// If rating is 'got_it': advancement in spaced repetition
// If rating is 'forgot': reset card back to review level
export async function updateFlashcardLeitner(
  cardId: string,
  rating: 'forgot' | 'got_it',
  deckId: string
): Promise<void> {
  const now = Date.now();

  if (!useMockDB && db) {
    const cardRef = doc(db!, 'flashcards', cardId);
    const cardDoc = await getDoc(cardRef);
    if (!cardDoc.exists()) return;

    const cardData = cardDoc.data() as FlashcardDocument;
    let nextInterval = 1;
    let nextEase = cardData.easeFactor || 2.5;

    if (rating === 'got_it') {
      // Correct answer: increment spaced repetition
      const prevInterval = cardData.intervalDays || 1;
      nextInterval = Math.ceil(prevInterval * nextEase);

      // Cap maximum interval at 365 days
      if (nextInterval > 365) nextInterval = 365;

      // Slightly improve ease factor for correct answers
      nextEase = Math.min(3.0, nextEase + 0.1);
    } else {
      // Forgot / Incorrect: reset card intervals
      nextInterval = 1;
      // Reduce ease factor if incorrect
      nextEase = Math.max(1.3, nextEase - 0.2);
    }

    const nextReview = now + nextInterval * 24 * 60 * 60 * 1000;

    await updateDoc(cardRef, {
      intervalDays: nextInterval,
      easeFactor: nextEase,
      nextReviewDate: nextReview
    });

    // Update last reviewed in Deck
    const deckRef = doc(db!, 'decks', deckId);
    await updateDoc(deckRef, {
      lastReviewedAt: now
    });

  } else {
    // Mock Local Database
    const cards = await getStorageData<FlashcardDocument>(MOCK_STORAGE_KEYS.CARDS);
    const cardIndex = cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = cards[cardIndex];
    let nextInterval = 1;
    let nextEase = card.easeFactor || 2.5;

    if (rating === 'got_it') {
      const prevInterval = card.intervalDays || 1;
      nextInterval = Math.ceil(prevInterval * nextEase);
      if (nextInterval > 365) nextInterval = 365;
      nextEase = Math.min(3.0, nextEase + 0.1);
    } else {
      nextInterval = 1;
      nextEase = Math.max(1.3, nextEase - 0.2);
    }

    const nextReview = now + nextInterval * 24 * 60 * 60 * 1000;

    cards[cardIndex] = {
      ...card,
      intervalDays: nextInterval,
      easeFactor: nextEase,
      nextReviewDate: nextReview
    };

    await saveStorageData(MOCK_STORAGE_KEYS.CARDS, cards);

    // Update last reviewed in Deck
    const decks = await getStorageData<Deck>(MOCK_STORAGE_KEYS.DECKS);
    const deckIndex = decks.findIndex(d => d.id === deckId);
    if (deckIndex !== -1) {
      decks[deckIndex].lastReviewedAt = now;
      await saveStorageData(MOCK_STORAGE_KEYS.DECKS, decks);
    }
  }
}

// 5. Daily Quota Control
export async function checkAndUpdateQuota(userId: string): Promise<boolean> {
  // Returns true if generation is allowed (quota exists), false if limit exceeded.
  // Quota is limited to 5 AI card generation calls per 24 hours for free users.

  const userProfile = await getUserProfile(userId);
  if (!userProfile) return false;

  // Pro and institutional accounts have unlimited quota
  if (userProfile.subscriptionTier === 'pro' || userProfile.subscriptionTier === 'institution') {
    return true;
  }

  // Quota limits for free tier
  if (userProfile.aiGenerationsUsedToday < 5) {
    // Increment generation count
    await updateUserProfile(userId, {
      aiGenerationsUsedToday: userProfile.aiGenerationsUsedToday + 1
    });
    return true;
  }

  return false;
}
