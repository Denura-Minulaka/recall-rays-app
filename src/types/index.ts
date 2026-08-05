export interface UserProfile {
  uid: string; // Firebase Auth user unique ID
  email: string; // User email address
  displayName: string; // User's full name or nickname
  subscriptionTier: 'free' | 'pro' | 'institution'; // Active monetization tier
  aiGenerationsUsedToday: number; // Quota tracker reset daily at midnight
  createdAt: number; // Unix timestamp of account creation
}

export interface Deck {
  id: string; // Firestore Document ID
  userId: string; // Owner UID (Indexed for fast querying)
  title: string; // Deck title (e.g., "Organic Chemistry Chapter 4")
  description?: string; // Optional summary of deck contents
  cardCount: number; // Total number of flashcards in the deck
  lastReviewedAt: number | null; // Timestamp of latest review session
  createdAt: number; // Creation timestamp
}

export interface FlashcardDocument {
  id: string; // Firestore Document ID
  deckId: string; // Parent Deck ID
  userId: string; // Owner UID for security rules validation
  question: string; // Front of card (AI generated or user edited)
  answer: string; // Back of card (AI generated or user edited)
  intervalDays: number; // Spaced repetition interval (Leitner algorithm)
  easeFactor: number; // Card difficulty multiplier (default: 2.5)
  nextReviewDate: number; // Unix timestamp when card is due for review
}

export interface Flashcard {
  question: string;
  answer: string;
}
