import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Flashcard as FlashcardType } from '../types';

interface FlashcardProps {
  card: FlashcardType;
  flipped: boolean;
  onFlip: () => void;
}

const { width } = Dimensions.get('window');

export const Flashcard: React.FC<FlashcardProps> = ({ card, flipped, onFlip }) => {
  const flipAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(flipAnimation, {
      toValue: flipped ? 180 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [flipped]);

  // Interpolations for card rotation
  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  // Calculate opacity triggers to resolve platform backfaceVisibility issues
  const frontOpacity = flipAnimation.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });

  const backOpacity = flipAnimation.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
    opacity: frontOpacity,
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
    opacity: backOpacity,
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        activeOpacity={0.95} 
        onPress={onFlip} 
        style={styles.touchArea}
      >
        {/* FRONT CARD */}
        <Animated.View style={[styles.card, styles.cardFront, frontAnimatedStyle]}>
          <View style={styles.cardHeader}>
            <View style={styles.glowingDot} />
            <Text style={styles.cardSideLabel}>QUESTION</Text>
          </View>
          
          <View style={styles.cardContent}>
            <Text style={styles.cardText}>{card.question}</Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.tapText}>Tap card to reveal answer</Text>
          </View>
        </Animated.View>

        {/* BACK CARD */}
        <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle, StyleSheet.absoluteFillObject]}>
          <View style={[styles.cardHeader, styles.cardHeaderBack]}>
            <View style={[styles.glowingDot, styles.glowingDotCyan]} />
            <Text style={[styles.cardSideLabel, styles.cardSideLabelCyan]}>ANSWER</Text>
          </View>
          
          <View style={styles.cardContent}>
            <Text style={styles.cardText}>{card.answer}</Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.tapText}>Tap card to show question</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 380,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchArea: {
    width: '100%',
    height: '100%',
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E1E2E',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    justifyContent: 'space-between',
    backfaceVisibility: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  cardFront: {
    borderColor: '#8B5CF6', // Purple neon border
    shadowColor: '#8B5CF6',
  },
  cardBack: {
    borderColor: '#06B6D4', // Cyan neon border
    shadowColor: '#06B6D4',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderBack: {
    justifyContent: 'flex-start',
  },
  glowingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    marginRight: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  glowingDotCyan: {
    backgroundColor: '#06B6D4',
    shadowColor: '#06B6D4',
  },
  cardSideLabel: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  cardSideLabelCyan: {
    color: '#06B6D4',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  cardText: {
    fontSize: 22,
    color: '#F3F4F6',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 32,
  },
  cardFooter: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2D2D44',
    paddingTop: 16,
  },
  tapText: {
    color: '#6B7280',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
