import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  Modal
} from 'react-native';
import { generateCardsFromText } from '../services/aiService';
import { createDeck, addFlashcardsToDeck, checkAndUpdateQuota, getCurrentUserSession } from '../config/firebase';
import { Flashcard } from '../types';

export default function CreateScreen({ navigation }: { navigation: any }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notesText, setNotesText] = useState('');
  
  // Loading & Flow State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // local form validation
  const handleGeneratePress = async () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a title for your study deck.');
      return;
    }
    if (notesText.trim().length < 15) {
      Alert.alert('Content Too Short', 'Please enter at least 15 characters of study notes to generate flashcards.');
      return;
    }

    // Auth verification
    const session = await getCurrentUserSession();
    if (!session) {
      Alert.alert('Session Required', 'Please register or log in on the Home Screen first.');
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Quota Check
      const hasQuota = await checkAndUpdateQuota(session.uid);
      if (!hasQuota) {
        setIsGenerating(false);
        setShowUpgradeModal(true);
        return;
      }

      // 2. Generate Cards
      const cards = await generateCardsFromText(notesText);
      if (cards.length === 0) {
        Alert.alert('AI Response Issue', 'No flashcards could be extracted. Try pasting different content.');
      } else {
        setGeneratedCards(cards);
        setIsPreviewMode(true);
      }
    } catch (err: any) {
      Alert.alert('Generation Error', err.message || 'Failed to generate flashcards. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditCardText = (index: number, key: 'question' | 'answer', newText: string) => {
    const updated = [...generatedCards];
    updated[index] = { ...updated[index], [key]: newText };
    setGeneratedCards(updated);
  };

  const handleSaveDeck = async () => {
    const session = await getCurrentUserSession();
    if (!session) return;

    try {
      // Create new deck
      const newDeck = await createDeck(session.uid, title, description);
      
      // Batch write flashcards
      await addFlashcardsToDeck(newDeck.id, session.uid, generatedCards);
      
      Alert.alert(
        'Success', 
        `Successfully created "${title}" with ${generatedCards.length} flashcards!`,
        [{ text: 'Start Studying', onPress: () => navigation.navigate('Review', { deckId: newDeck.id, title: newDeck.title }) }]
      );
      
      // Reset inputs
      setTitle('');
      setDescription('');
      setNotesText('');
      setGeneratedCards([]);
      setIsPreviewMode(false);
      
    } catch (err: any) {
      Alert.alert('Error Saving Deck', err.message || 'Could not save the flashcards.');
    }
  };

  const handleSimulateUpgrade = () => {
    setShowUpgradeModal(false);
    Alert.alert('Subscription Success', 'You are now a Recall Rays PRO member! Enjoy unlimited AI card generations.');
  };

  if (isGenerating) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loaderTitle}>Focusing AI Recall Rays...</Text>
        <Text style={styles.loaderSubtitle}>Ingesting notes & structuring study cards</Text>
        
        {/* Decorative Neon Ray Elements */}
        <View style={styles.rayEffect1} />
        <View style={styles.rayEffect2} />
      </View>
    );
  }

  if (isPreviewMode) {
    return (
      <ScrollView contentContainerStyle={styles.container} style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.titleText}>Verify & Customize</Text>
          <Text style={styles.subtitleText}>Review or edit AI-generated cards before saving</Text>
        </View>

        {generatedCards.map((card, idx) => (
          <View key={idx} style={styles.previewCard}>
            <Text style={styles.previewLabel}>CARD {idx + 1}</Text>
            
            <Text style={styles.inputLabel}>Question</Text>
            <TextInput
              style={styles.cardInput}
              value={card.question}
              onChangeText={(txt) => handleEditCardText(idx, 'question', txt)}
              multiline
            />
            
            <Text style={styles.inputLabel}>Answer</Text>
            <TextInput
              style={styles.cardInput}
              value={card.answer}
              onChangeText={(txt) => handleEditCardText(idx, 'answer', txt)}
              multiline
            />
          </View>
        ))}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsPreviewMode(false)}>
            <Text style={styles.secondaryButtonText}>Back to Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSaveDeck}>
            <Text style={styles.primaryButtonText}>Save & Finish</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.container} style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.titleText}>Create Study Deck</Text>
          <Text style={styles.subtitleText}>Turn notes and documents into active-recall flashcards using Gemini AI</Text>
        </View>

        {/* Deck metadata input */}
        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>DECK TITLE</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Organic Chemistry: Chapter 3"
            placeholderTextColor="#4B5563"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Key definitions & reaction mechanisms"
            placeholderTextColor="#4B5563"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Raw text input */}
        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>PASTE NOTES / TEXTBOOK EXTRACTS</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Paste your lecture notes, textbook chapters, or summary here..."
            placeholderTextColor="#4B5563"
            value={notesText}
            onChangeText={setNotesText}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={styles.generateButton} onPress={handleGeneratePress}>
          <Text style={styles.generateButtonText}>Generate Cards with Gemini AI</Text>
        </TouchableOpacity>

        {/* Monetization Upgrade Modal */}
        <Modal
          visible={showUpgradeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUpgradeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Daily Limit Reached ⚡</Text>
              <Text style={styles.modalDescription}>
                Free accounts are limited to 5 AI deck generations per 24 hours. Upgrade to Recall Rays PRO to unlock unlimited generations.
              </Text>
              
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>$4.99 / month</Text>
              </View>

              <TouchableOpacity style={styles.upgradeButton} onPress={handleSimulateUpgrade}>
                <Text style={styles.upgradeButtonText}>Upgrade to PRO</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeButton} onPress={() => setShowUpgradeModal(false)}>
                <Text style={styles.closeButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  scrollView: {
    backgroundColor: '#0F0F1A',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  titleText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F3F4F6',
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8B5CF6',
    letterSpacing: 1,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1E1E2E',
    borderColor: '#2D2D44',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#F3F4F6',
    fontSize: 15,
  },
  textArea: {
    height: 180,
  },
  generateButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F1A',
    padding: 30,
  },
  loaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F3F4F6',
    marginTop: 20,
    marginBottom: 8,
  },
  loaderSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  rayEffect1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    zIndex: -1,
  },
  rayEffect2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
    zIndex: -2,
  },
  previewCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#06B6D4',
    letterSpacing: 1,
    marginBottom: 12,
  },
  cardInput: {
    backgroundColor: '#0F0F1A',
    borderRadius: 8,
    padding: 12,
    color: '#F3F4F6',
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  secondaryButtonText: {
    color: '#9CA3AF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  // Modal upgrade classes
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E1E2E',
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderColor: '#8B5CF6',
    borderWidth: 1.5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F3F4F6',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  priceTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    marginBottom: 20,
  },
  priceText: {
    color: '#8B5CF6',
    fontWeight: 'bold',
    fontSize: 18,
  },
  upgradeButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    paddingVertical: 10,
  },
  closeButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
