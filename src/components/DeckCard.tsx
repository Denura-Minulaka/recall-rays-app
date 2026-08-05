import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Deck } from '../types';

interface DeckCardProps {
  deck: Deck;
  dueCount: number;
  onPress: () => void;
}

export const DeckCard: React.FC<DeckCardProps> = ({ deck, dueCount, onPress }) => {
  // Format last reviewed date
  const formatLastReviewed = (timestamp: number | null) => {
    if (!timestamp) return 'Never reviewed';
    const date = new Date(timestamp);
    return `Reviewed ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <Text style={styles.title} numberOfLines={1}>{deck.title}</Text>
        {dueCount > 0 ? (
          <View style={styles.dueBadge}>
            <Text style={styles.dueText}>{dueCount} DUE</Text>
          </View>
        ) : (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>LEARNED</Text>
          </View>
        )}
      </View>

      {deck.description ? (
        <Text style={styles.description} numberOfLines={2}>{deck.description}</Text>
      ) : (
        <Text style={styles.noDescription}>No description provided.</Text>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.statContainer}>
          <Text style={styles.statLabel}>Cards</Text>
          <Text style={styles.statValue}>{deck.cardCount}</Text>
        </View>
        <Text style={styles.lastReviewed}>{formatLastReviewed(deck.lastReviewedAt)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#312E81', // subtle dark purple border
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F3F4F6',
    flex: 1,
    marginRight: 8,
  },
  dueBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)', // light red/crimson glow
    borderColor: '#EF4444',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dueText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)', // light green glow
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  completedText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: 20,
  },
  noDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2D2D44',
    paddingTop: 12,
  },
  statContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#06B6D4', // cyan highlight
  },
  lastReviewed: {
    fontSize: 11,
    color: '#6B7280',
  },
});
