import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, SafeAreaView, Animated,
} from 'react-native';
import BeatCard from '../components/BeatCard';
import Header from '../components/Header';
import { LoadingState, EmptyState, ErrorState } from '../components/StateViews';
import { fetchRecommendations } from '../api/client';
import { colors, spacing, typography } from '../theme/theme';

export default function ForYouScreen({ navigation }) {
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [strategy, setStrategy] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchRecommendations(20);
      setBeats(result.data);
      setStrategy(result.strategy);
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => navigation.addListener('focus', load), [navigation, load]);

  useEffect(() => {
    const anim = Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [fadeAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openBeat = (beat) => navigation.navigate('BeatDetails', { beatId: beat.id });

  const subtitle = strategy && strategy.includes('trending')
    ? 'Trending picks — browse a few beats to personalize'
    : 'Personalized picks based on your taste';

  return (
    <SafeAreaView style={styles.safe}>
      <Header />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <Text style={styles.screenTitle}>For You</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {loading ? (
          <LoadingState label="Curating your feed…" />
        ) : error ? (
          <ErrorState subtitle={error} onRetry={load} />
        ) : beats.length === 0 ? (
          <EmptyState title="Nothing yet" subtitle="Browse or search a few beats to get started." />
        ) : (
          <FlatList
            data={beats}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
            }
            renderItem={({ item }) => (
              <BeatCard beat={item} onPress={() => openBeat(item)} />
            )}
          />
        )}
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
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
    letterSpacing: 0.2,
  },
  row: {
    gap: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: 32,
  },
});
