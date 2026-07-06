import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, artworkGradients } from '../theme/theme';

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

export default function BeatCard({ beat, onPress }) {
  const gradColors = useMemo(
    () => artworkGradients[beat.id % artworkGradients.length],
    [beat.id],
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [fadeAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    return () => {
      scaleAnim.setValue(1);
    };
  }, [scaleAnim]);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`beat-card-${beat.id}`}
      >
        <LinearGradient
          colors={gradColors}
          style={styles.artwork}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.artOverlay}>
            <View style={styles.genrePill}>
              <Text style={styles.genreText}>{beat.genre.toUpperCase()}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>{beat.title}</Text>
          <Text style={styles.producer} numberOfLines={1}>{beat.producer}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="play" size={10} color={colors.textFaint} />
              <Text style={styles.metaText}>{formatNum(beat.plays)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="heart" size={10} color={colors.textFaint} />
              <Text style={styles.metaText}>{formatNum(beat.likes)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  artwork: {
    width: '100%',
    height: 150,
    position: 'relative',
  },
  artOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
  },
  genrePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  genreText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  body: {
    padding: spacing.sm + 2,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.1,
  },
  producer: {
    color: colors.textMuted,
    fontSize: 11,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '600',
  },
});
