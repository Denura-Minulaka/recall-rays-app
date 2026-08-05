import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  getCurrentUserSession, 
  getUserProfile, 
  getUserDecks,
  getDeckFlashcards,
  useMockDB
} from '../config/firebase';
import { Deck, UserProfile } from '../types';
import { DeckCard } from '../components/DeckCard';

export default function HomeScreen({ navigation }: { navigation: any }) {
  // Authentication States
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // App States
  const [decks, setDecks] = useState<Deck[]>([]);
  const [decksDueCounts, setDecksDueCounts] = useState<{ [deckId: string]: number }>({});
  const [totalDueCount, setTotalDueCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Initialize session
  useEffect(() => {
    checkSession();
  }, []);

  // Whenever session changes, fetch data
  useEffect(() => {
    if (session) {
      fetchUserData();
    } else {
      setDecks([]);
      setProfile(null);
    }
  }, [session]);

  const checkSession = async () => {
    setAuthLoading(true);
    try {
      const activeSession = await getCurrentUserSession();
      setSession(activeSession);
    } catch (e) {
      console.log('No active session found.');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchUserData = async () => {
    if (!session) return;
    setDataLoading(true);
    try {
      // 1. Fetch profile
      const userProfile = await getUserProfile(session.uid);
      setProfile(userProfile);

      // 2. Fetch decks
      const userDecks = await getUserDecks(session.uid);
      setDecks(userDecks);

      // 3. Compute cards due count per deck
      const dueCounts: { [deckId: string]: number } = {};
      let totalDue = 0;
      const now = Date.now();

      for (const deck of userDecks) {
        const cards = await getDeckFlashcards(deck.id);
        const dueCards = cards.filter(card => card.nextReviewDate <= now);
        dueCounts[deck.id] = dueCards.length;
        totalDue += dueCards.length;
      }
      setDecksDueCounts(dueCounts);
      setTotalDueCount(totalDue);

    } catch (e: any) {
      console.error('Error fetching data:', e);
      Alert.alert('Load Error', 'Failed to fetch your study data. Please refresh.');
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  // Auth actions
  const handleAuthSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Form Error', 'Please enter email and password.');
      return;
    }
    if (!isLoginMode && !displayName.trim()) {
      Alert.alert('Form Error', 'Please enter a display name.');
      return;
    }

    setAuthLoading(true);
    try {
      if (isLoginMode) {
        const user = await loginUser(email.trim(), password);
        setSession(user);
      } else {
        const user = await registerUser(email.trim(), password, displayName.trim());
        setSession(user);
      }
      // Reset inputs
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err: any) {
      Alert.alert('Auth Failure', err.message || 'Check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAnonymousTry = async () => {
    setAuthLoading(true);
    try {
      const anonEmail = `guest_${Math.floor(Math.random() * 1000000)}@recallrays.com`;
      const user = await registerUser(anonEmail, 'guest_password_123', 'Recall Guest');
      setSession(user);
    } catch (err: any) {
      Alert.alert('Guest Mode Error', err.message || 'Could not launch Guest session.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setSession(null);
    } catch (e) {
      Alert.alert('Logout Error', 'Could not terminate session.');
    }
  };

  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Establishing Rays connection...</Text>
      </View>
    );
  }

  // Not Logged In View
  if (!session) {
    return (
      <ScrollView contentContainerStyle={styles.authContainer}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>RECALL RAYS</Text>
          <Text style={styles.brandSubtitle}>Active Recall & Spaced Repetition Synthesizer</Text>
          {useMockDB && (
            <View style={styles.mockDBBadge}>
              <Text style={styles.mockDBText}>OFFLINE / STORAGE MODE</Text>
            </View>
          )}
        </View>

        <View style={styles.authCard}>
          <Text style={styles.authCardTitle}>{isLoginMode ? 'Sign In' : 'Create Account'}</Text>

          {!isLoginMode && (
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>NAME</Text>
              <TextInput
                style={styles.authInput}
                placeholder="Your Name"
                placeholderTextColor="#4B5563"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.authInput}
              placeholder="name@domain.com"
              placeholderTextColor="#4B5563"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>PASSWORD</Text>
            <TextInput
              style={styles.authInput}
              placeholder="••••••••"
              placeholderTextColor="#4B5563"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.authSubmitButton} onPress={handleAuthSubmit}>
            <Text style={styles.authSubmitText}>{isLoginMode ? 'Access Dashboard' : 'Register Profile'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.switchModeButton} 
            onPress={() => setIsLoginMode(!isLoginMode)}
          >
            <Text style={styles.switchModeText}>
              {isLoginMode ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.anonymousButton} onPress={handleAnonymousTry}>
          <Text style={styles.anonymousButtonText}>Try Instantly (Guest Mode)</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Logged In View
  return (
    <ScrollView 
      style={styles.homeContainer} 
      contentContainerStyle={styles.homeContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8B5CF6" />
      }
    >
      {/* User Header */}
      <View style={styles.homeHeader}>
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.nameText}>{profile?.displayName || 'Student'}</Text>
        </View>

        <View style={styles.profileBadgeGroup}>
          <View style={profile?.subscriptionTier === 'pro' ? styles.proTierBadge : styles.freeTierBadge}>
            <Text style={styles.tierText}>{profile?.subscriptionTier === 'pro' ? 'PRO' : 'FREE'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Spaced repetition indicator cards */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Daily Review</Text>
          <Text style={[styles.metricValue, totalDueCount > 0 ? styles.dueTextGlow : {}]}>
            {totalDueCount}
          </Text>
          <Text style={styles.metricDesc}>cards waiting</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>AI Generations</Text>
          <Text style={styles.metricValue}>
            {profile?.subscriptionTier === 'pro' ? '∞' : `${profile?.aiGenerationsUsedToday || 0}/5`}
          </Text>
          <Text style={styles.metricDesc}>used today</Text>
        </View>
      </View>

      {/* Study Decks List */}
      <View style={styles.deckListSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Study Decks</Text>
          <TouchableOpacity 
            style={styles.addDeckButton}
            onPress={() => navigation.navigate('Create')}
          >
            <Text style={styles.addDeckText}>+ Create Deck</Text>
          </TouchableOpacity>
        </View>

        {dataLoading && decks.length === 0 ? (
          <ActivityIndicator size="small" color="#8B5CF6" style={styles.listLoader} />
        ) : decks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Decks Found</Text>
            <Text style={styles.emptySubtitle}>
              Create a deck by pasting lecture notes to let Gemini AI generate study cards.
            </Text>
            <TouchableOpacity 
              style={styles.emptyAction}
              onPress={() => navigation.navigate('Create')}
            >
              <Text style={styles.emptyActionText}>Generate First Deck</Text>
            </TouchableOpacity>
          </View>
        ) : (
          decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              dueCount={decksDueCounts[deck.id] || 0}
              onPress={() => {
                if (deck.cardCount === 0) {
                  Alert.alert('Empty Deck', 'This deck has no cards. Add cards first.');
                  return;
                }
                navigation.navigate('Review', { deckId: deck.id, title: deck.title });
              }}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    color: '#9CA3AF',
    fontSize: 14,
  },
  authContainer: {
    flexGrow: 1,
    backgroundColor: '#0F0F1A',
    padding: 24,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F3F4F6',
    letterSpacing: 2,
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#8B5CF6',
    marginTop: 6,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  mockDBBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: '#06B6D4',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mockDBText: {
    color: '#06B6D4',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  authCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2D2D44',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 20,
  },
  authCardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F3F4F6',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8B5CF6',
    letterSpacing: 1,
    marginBottom: 6,
  },
  authInput: {
    backgroundColor: '#0F0F1A',
    borderColor: '#2D2D44',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F3F4F6',
    fontSize: 14,
  },
  authSubmitButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  authSubmitText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  switchModeButton: {
    alignItems: 'center',
    marginTop: 18,
  },
  switchModeText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  anonymousButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#2D2D44',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  anonymousButtonText: {
    color: '#9CA3AF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // LOGGED IN STYLES
  homeContainer: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  homeContent: {
    padding: 20,
    paddingBottom: 40,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F3F4F6',
  },
  profileBadgeGroup: {
    alignItems: 'flex-end',
  },
  freeTierBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    borderColor: '#6B7280',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  proTierBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)', // golden glow
    borderColor: '#EAB308',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  tierText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F3F4F6',
    letterSpacing: 0.5,
  },
  logoutButton: {
    paddingVertical: 2,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 12,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D2D44',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F3F4F6',
  },
  dueTextGlow: {
    color: '#EF4444',
    textShadowColor: '#EF4444',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  metricDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  deckListSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F3F4F6',
  },
  addDeckButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addDeckText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listLoader: {
    marginTop: 20,
  },
  emptyState: {
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D44',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F3F4F6',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyAction: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#8B5CF6',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyActionText: {
    color: '#8B5CF6',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
