import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  ScrollView,
  Dimensions
} from 'react-native';
import { getDeckFlashcards, updateFlashcardLeitner } from '../config/firebase';
import { FlashcardDocument } from '../types';
import { Flashcard } from '../components/Flashcard';

const { width } = Dimensions.get('window');

export default function ReviewScreen({ route, navigation }: { route: any, navigation: any }) {
  const { deckId, title } = route.params;

  // Data States
  const [cards, setCards] = useState<FlashcardDocument[]>([]);
  const [sessionCards, setSessionCards] = useState<FlashcardDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReviewingAll, setIsReviewingAll] = useState(false);

  // Session Control States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);

  // Performance Stats
  const [forgotCount, setForgotCount] = useState(0);
  const [gotItCount, setGotItCount] = useState(0);

  useEffect(() => {
    loadCards();
  }, [deckId]);

  const loadCards = async () => {
    setLoading(true);
    try {
      const allCards = await getDeckFlashcards(deckId);
      setCards(allCards);

      // Filter due cards (nextReviewDate <= now)
      const now = Date.now();
      const due = allCards.filter(c => c.nextReviewDate <= now);
      
      setSessionCards(due);
    } catch (e) {
      Alert.alert('Load Error', 'Failed to retrieve flashcards for review.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPracticeAll = () => {
    setIsReviewingAll(true);
    setSessionCards(cards);
  };

  const handleResponse = async (rating: 'forgot' | 'got_it') => {
    const currentCard = sessionCards[currentIndex];
    
    // Update performance counts
    if (rating === 'forgot') {
      setForgotCount(prev => prev + 1);
    } else {
      setGotItCount(prev => prev + 1);
    }

    try {
      // Save progression update in database / storage
      await updateFlashcardLeitner(currentCard.id, rating, deckId);
    } catch (e) {
      console.error('Failed to update Leitner algorithm status:', e);
    }

    // Move to next card
    if (currentIndex + 1 < sessionCards.length) {
      setCardFlipped(false);
      // Wait for flip back spring animation to complete before switching text
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 150);
    } else {
      setSessionFinished(true);
    }
  };

  // Generate contextual monetization recommendations based on deck title
  const getContextualPartnerships = () => {
    const deckTitleLower = title.toLowerCase();
    
    if (deckTitleLower.includes('chem') || deckTitleLower.includes('science') || deckTitleLower.includes('bio')) {
      return {
        title: "Recommended: Kaplan Science Study Hub",
        desc: "Get 15% off Kaplan MCAT Science guides and practice exams.",
        code: "RECALLCHEM15",
        link: "https://www.kaptest.com"
      };
    } else if (deckTitleLower.includes('code') || deckTitleLower.includes('dev') || deckTitleLower.includes('js') || deckTitleLower.includes('react')) {
      return {
        title: "Recommended: ZeroToMastery Academy",
        desc: "Get full-stack development courses and flashcard extensions.",
        code: "RECALLDEV20",
        link: "https://zerotomastery.io"
      };
    } else {
      // General study support
      return {
        title: "Recommended: Smart Study Desk Accessories",
        desc: "Get study timers, ergonomic desks, and memory aids.",
        code: "RECALLSTUDY10",
        link: "https://www.amazon.com"
      };
    }
  };

  const handleSimulatePartnerClick = (link: string) => {
    Alert.alert(
      'Affiliate Redirection',
      `Redirecting to study partner: ${link}. Thank you for supporting Recall Rays!`
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#06B6D4" />
        <Text style={styles.loadingText}>Fetching study session cards...</Text>
      </View>
    );
  }

  // 1. Empty Deck State (No Cards at All)
  if (cards.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>No Cards Available</Text>
        <Text style={styles.description}>This deck doesn't have any flashcards. Paste study notes on the Create tab to generate them.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Create')}>
          <Text style={styles.primaryButtonText}>Generate Cards</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. Clear Deck State (Cards exist, but 0 are due today)
  if (sessionCards.length === 0 && !sessionFinished) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.partyEmoji}>🎉</Text>
        <Text style={styles.allDoneTitle}>All Caught Up!</Text>
        <Text style={styles.allDoneDesc}>
          No cards are due for review in "{title}" today based on your spaced-repetition scheduler.
        </Text>
        
        <TouchableOpacity style={styles.primaryButton} onPress={handleStartPracticeAll}>
          <Text style={styles.primaryButtonText}>Review All Cards Anyway</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Review Finished Screen
  if (sessionFinished) {
    const partner = getContextualPartnerships();
    const totalReviewed = sessionCards.length;
    const accuracy = totalReviewed > 0 ? Math.round((gotItCount / totalReviewed) * 100) : 0;

    return (
      <ScrollView contentContainerStyle={styles.finishedContainer} style={styles.finishedScrollView}>
        <Text style={styles.trophyEmoji}>🏆</Text>
        <Text style={styles.allDoneTitle}>Session Complete!</Text>
        <Text style={styles.allDoneDesc}>You have processed all active recall rays for this session.</Text>

        {/* Stats card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>CARDS REVIEWED</Text>
            <Text style={styles.statNumber}>{totalReviewed}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>RETENTION RATE</Text>
            <Text style={[styles.statNumber, styles.cyanText]}>{accuracy}%</Text>
          </View>
        </View>

        {/* Partner Recommendations - Monetization Blueprint */}
        <View style={styles.partnerCard}>
          <View style={styles.partnerHeader}>
            <Text style={styles.partnerTag}>PARTNER RESOURCE</Text>
          </View>
          <Text style={styles.partnerTitle}>{partner.title}</Text>
          <Text style={styles.partnerDesc}>{partner.desc}</Text>
          <View style={styles.couponContainer}>
            <Text style={styles.couponLabel}>USE DISCOUNT CODE:</Text>
            <Text style={styles.couponCode}>{partner.code}</Text>
          </View>
          <TouchableOpacity 
            style={styles.partnerButton} 
            onPress={() => handleSimulatePartnerClick(partner.link)}
          >
            <Text style={styles.partnerButtonText}>Explore Resource</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => {
            // Restart review
            setSessionFinished(false);
            setCurrentIndex(0);
            setCardFlipped(false);
            setForgotCount(0);
            setGotItCount(0);
            loadCards();
          }}
        >
          <Text style={styles.primaryButtonText}>Review Again</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.secondaryButtonText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // 4. Active Study Session UI
  const progressPercent = sessionCards.length > 0 
    ? ((currentIndex) / sessionCards.length) * 100 
    : 0;

  return (
    <View style={styles.reviewContainer}>
      {/* Progress Bar & Header */}
      <View style={styles.progressHeader}>
        <View style={styles.progressTextRow}>
          <Text style={styles.deckTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.progressCounter}>
            {currentIndex + 1} / {sessionCards.length}
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Interactive Card */}
      <View style={styles.cardContainer}>
        <Flashcard
          card={sessionCards[currentIndex]}
          flipped={cardFlipped}
          onFlip={() => setCardFlipped(!cardFlipped)}
        />
      </View>

      {/* Response Action Row */}
      <View style={styles.actionContainer}>
        {cardFlipped ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.rateButton, styles.forgotButton]} 
              onPress={() => handleResponse('forgot')}
            >
              <Text style={styles.forgotButtonText}>Forgot</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.rateButton, styles.gotItButton]} 
              onPress={() => handleResponse('got_it')}
            >
              <Text style={styles.gotItButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.revealHintButton} onPress={() => setCardFlipped(true)}>
            <Text style={styles.revealHintText}>Tap card to reveal answer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reviewContainer: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    padding: 20,
    justifyContent: 'space-between',
  },
  finishedScrollView: {
    backgroundColor: '#0F0F1A',
  },
  finishedContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#0F0F1A',
    paddingTop: 40,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 14,
    color: '#06B6D4',
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F3F4F6',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  partyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  trophyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  allDoneTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F3F4F6',
    marginBottom: 12,
    textAlign: 'center',
  },
  allDoneDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  progressHeader: {
    marginTop: 10,
    marginBottom: 20,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deckTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F3F4F6',
    flex: 1,
    marginRight: 10,
  },
  progressCounter: {
    color: '#06B6D4',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#1E1E2E',
    borderRadius: 3,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#06B6D4',
    borderRadius: 3,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  actionContainer: {
    marginBottom: 20,
    height: 70,
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  rateButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  forgotButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  forgotButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  gotItButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  gotItButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  revealHintButton: {
    backgroundColor: '#1E1E2E',
    borderColor: '#2D2D44',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  revealHintText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  statsCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F3F4F6',
  },
  cyanText: {
    color: '#06B6D4',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#2D2D44',
    height: '100%',
  },
  partnerCard: {
    backgroundColor: '#1E1E2D',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    marginBottom: 28,
  },
  partnerHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  partnerTag: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3B82F6',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    letterSpacing: 1,
  },
  partnerTitle: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  partnerDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  couponContainer: {
    backgroundColor: '#0F0F1A',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  couponLabel: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  couponCode: {
    color: '#EAB308',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  partnerButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  partnerButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#1E1E2E',
    borderColor: '#2D2D44',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#9CA3AF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
