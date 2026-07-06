import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import SearchBar from '../components/SearchBar';
import BeatCard from '../components/BeatCard';
import Header from '../components/Header';
import { LoadingState, EmptyState, ErrorState } from '../components/StateViews';
import { searchBeats } from '../api/client';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { colors, spacing, radius } from '../theme/theme';

const CATEGORIES = [
  { icon: 'zap', title: 'Trap', query: 'Trap', gradient: ['#8B5CF6', '#EC4899'] },
  { icon: 'mic', title: 'Hip Hop', query: 'Hip Hop', gradient: ['#3B82F6', '#8B5CF6'] },
  { icon: 'coffee', title: 'Lofi', query: 'Lofi', gradient: ['#10B981', '#059669'] },
  { icon: 'activity', title: 'Drill', query: 'Drill', gradient: ['#FF2D7A', '#9F1239'] },
  { icon: 'headphones', title: 'R&B', query: 'R&B', gradient: ['#F59E0B', '#D97706'] },
  { icon: 'radio', title: 'Synthwave', query: 'Synthwave', gradient: ['#EC4899', '#3B82F6'] },
];

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 350);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchBeats(trimmed)
      .then((data) => { if (!cancelled) setResults(data); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Search failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery, retryTrigger]);

  useEffect(() => {
    const anim = Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [fadeAnim]);

  const openBeat = (beat) => navigation.navigate('BeatDetails', { beatId: beat.id });
  const isSearching = debouncedQuery.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <Text style={styles.screenTitle}>Search</Text>

        <View style={styles.searchWrapper}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder="Try 'dark travis scott type beat'…"
          />
        </View>

        <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {!isSearching ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Browse Genres</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.title}
                  style={styles.categoryCard}
                  onPress={() => setQuery(cat.query)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={cat.gradient}
                    style={styles.categoryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Feather name={cat.icon} size={18} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.categoryTitle}>{cat.title}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.searchTipContainer}>
              <Feather name="info" size={16} color={colors.accent} />
              <Text style={styles.searchTipText}>
                Try searching by genre, mood like "dark", or producer name.
              </Text>
            </View>
          </ScrollView>
        ) : loading ? (
          <LoadingState label={`Searching…`} />
        ) : error ? (
          <ErrorState subtitle={error} onRetry={() => setRetryTrigger((prev) => prev + 1)} />
        ) : results.length === 0 ? (
          <EmptyState
            title="No results"
            subtitle={`Nothing matched "${debouncedQuery}". Try a different genre, mood, or producer.`}
          />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <BeatCard beat={item} onPress={() => openBeat(item)} />
            )}
          />
        )}
      </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xs,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    letterSpacing: -0.3,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  searchWrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  row: {
    gap: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: 32,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 32,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  categoryCard: {
    width: '47%',
    height: 90,
    borderRadius: radius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  categoryGradient: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  categoryTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  searchTipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  searchTipText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
