import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LoadingState, ErrorState } from '../components/StateViews';
import { fetchBeatById, fetchSimilarBeats } from '../api/client';
import { colors, spacing, radius, gradients, artworkGradients } from '../theme/theme';

export default function BeatDetailsScreen({ route }) {
  const { beatId } = route.params;
  const navigation = useNavigation();
  const [beat, setBeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [selectedLicense, setSelectedLicense] = useState('wav');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBeatById(beatId);
      setBeat(data);
      fetchSimilarBeats(beatId, 5)
        .then(setSimilar)
        .catch(() => setSimilar([]));
    } catch (err) {
      setError(err.message || 'Failed to load beat details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatId]);

  useEffect(() => {
    const anim = Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [fadeAnim]);

  if (loading) return <LoadingState label="Loading beat details…" />;
  if (error) return <ErrorState subtitle={error} onRetry={load} />;
  if (!beat) return null;

  const artColors = artworkGradients[beat.id % artworkGradients.length];
  const initial = beat.title.charAt(0).toUpperCase();

  const getLicensePrice = () => {
    if (selectedLicense === 'mp3') return '$29.99';
    if (selectedLicense === 'wav') return '$49.99';
    return '$199.99';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Hero Section */}
        <LinearGradient
          colors={gradients.hero}
          style={styles.heroSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          {/* Vinyl Record Mockup Container */}
          <View style={styles.artworkContainer}>
            {/* Record Sleeve */}
            <LinearGradient colors={artColors} style={styles.artworkLarge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.artworkInitial}>{initial}</Text>
            </LinearGradient>
            {/* Vinyl Record */}
            <View style={styles.vinylDisc}>
              <View style={styles.vinylGroove1}>
                <View style={styles.vinylGroove2}>
                  <LinearGradient colors={artColors} style={styles.vinylLabel} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.heroGenrePill}>
            <Text style={styles.heroGenreText}>{beat.genre.toUpperCase()}</Text>
          </View>
          <Text style={styles.heroTitle}>{beat.title}</Text>
          <Text style={styles.heroProducer}>Produced by {beat.producer}</Text>
        </LinearGradient>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Stat label="Plays" value={beat.plays.toLocaleString()} icon="▶" iconColor={colors.accent} />
          <View style={styles.statDivider} />
          <Stat label="Likes" value={beat.likes.toLocaleString()} icon="♡" iconColor={colors.accent} />
          <View style={styles.statDivider} />
          <Stat label="BPM" value={String(beat.bpm)} icon="♩" iconColor={colors.primary} />
          <View style={styles.statDivider} />
          <Stat label="Key" value={beat.key || 'N/A'} icon="♯" iconColor={colors.success} />
        </View>

        {/* Description */}
        <Section title="Description">
          <Text style={styles.description}>{beat.description}</Text>
        </Section>

        {/* Details list */}
        <Section title="Details">
          <Detail label="Mood" value={beat.mood} />
          <Detail label="BPM" value={`${beat.bpm} beats per minute`} />
          <Detail label="Scale Key" value={beat.key || 'Not specified'} />
          <Detail label="Primary Genre" value={beat.genre} />
        </Section>

        {/* Tags */}
        <Section title="Tags">
          <View style={styles.tagsWrap}>
            {beat.tags.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* Similar Beats */}
        {similar.length > 0 && (
          <Section title="Similar Beats">
            <Text style={styles.similarSubtitle}>Recommendation engine matches</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.similarScroll}
              contentContainerStyle={styles.similarScrollContent}
            >
              {similar.map((s) => {
                const simColors = artworkGradients[s.id % artworkGradients.length];
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.similarCard}
                    onPress={() => navigation.push('BeatDetails', { beatId: s.id })}
                    testID={`similar-beat-${s.id}`}
                    activeOpacity={0.75}
                  >
                    <LinearGradient colors={simColors} style={styles.similarArtwork} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Text style={styles.similarInitial}>{s.title.charAt(0)}</Text>
                    </LinearGradient>
                    <Text style={styles.similarTitle} numberOfLines={1}>{s.title}</Text>
                    <Text style={styles.similarMeta} numberOfLines={1}>{s.genre} · {s.mood}</Text>
                    <View style={styles.similarityBar}>
                      <View style={[styles.similarityFill, { width: `${Math.round(s.similarity * 100)}%` }]} />
                    </View>
                    <Text style={styles.similarityLabel}>{Math.round(s.similarity * 100)}% match</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Section>
        )}

        {/* Licensing Panel */}
        <Section title="Licensing">
          <View style={styles.licensingContainer}>
            <TouchableOpacity
              style={[styles.licenseRow, selectedLicense === 'mp3' && styles.licenseRowActive]}
              onPress={() => setSelectedLicense('mp3')}
              activeOpacity={0.85}
            >
              <View style={styles.licenseCheck}>
                {selectedLicense === 'mp3' && <View style={styles.licenseCheckInner} />}
              </View>
              <View style={styles.licenseInfo}>
                <Text style={styles.licenseTitle}>Basic MP3 Lease</Text>
                <Text style={styles.licenseTerms}>MP3 · 10K streams</Text>
              </View>
              <Text style={styles.licensePrice}>$29.99</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.licenseRow, selectedLicense === 'wav' && styles.licenseRowActive]}
              onPress={() => setSelectedLicense('wav')}
              activeOpacity={0.85}
            >
              <View style={styles.licenseCheck}>
                {selectedLicense === 'wav' && <View style={styles.licenseCheckInner} />}
              </View>
              <View style={styles.licenseInfo}>
                <View style={styles.licenseTitleRow}>
                  <Text style={styles.licenseTitle}>Premium WAV Lease</Text>
                  <View style={styles.recommendBadge}>
                    <Text style={styles.recommendText}>POPULAR</Text>
                  </View>
                </View>
                <Text style={styles.licenseTerms}>WAV+MP3 · 50K streams · Commercial</Text>
              </View>
              <Text style={styles.licensePrice}>$49.99</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.licenseRow, selectedLicense === 'exclusive' && styles.licenseRowActive]}
              onPress={() => setSelectedLicense('exclusive')}
              activeOpacity={0.85}
            >
              <View style={styles.licenseCheck}>
                {selectedLicense === 'exclusive' && <View style={styles.licenseCheckInner} />}
              </View>
              <View style={styles.licenseInfo}>
                <Text style={styles.licenseTitle}>Unlimited Stems</Text>
                <Text style={styles.licenseTerms}>WAV+Stems · Unlimited · Radio/TV</Text>
              </View>
              <Text style={styles.licensePrice}>$199.99</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.checkoutBtn} activeOpacity={0.85}>
            <LinearGradient
              colors={gradients.logo}
              style={styles.checkoutGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="shopping-bag" size={16} color="#FFF" />
              <Text style={styles.checkoutText}>Purchase &nbsp;({getLicensePrice()})</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Section>

      </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Stat({ label, value, icon, iconColor }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statIcon, { color: iconColor || colors.accent }]}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Detail({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl * 3,
  },

  // Hero
  heroSection: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    marginBottom: spacing.xs,
  },
  artworkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    position: 'relative',
    height: 140,
    width: 200,
  },
  artworkLarge: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 4, height: 4 },
    elevation: 8,
  },
  artworkInitial: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 52,
    fontWeight: '800',
  },
  vinylDisc: {
    position: 'absolute',
    right: 15,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#05030A',
    borderWidth: 2,
    borderColor: '#181424',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 2, height: 2 },
    elevation: 6,
  },
  vinylGroove1: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylGroove2: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylLabel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  heroGenrePill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    marginBottom: spacing.sm,
  },
  heroGenreText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 1,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  heroProducer: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.md,
  },
  statIcon: {
    fontSize: 13,
  },
  statValue: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  statLabel: {
    color: colors.textFaint,
    fontSize: 9,
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Sections
  section: {
    marginTop: spacing.md + 4,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.accent,
    fontWeight: '800',
    marginBottom: spacing.sm + 2,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  detailLabel: {
    color: colors.textFaint,
    fontSize: 13,
  },
  detailValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },

  // Licensing
  licensingContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  licenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  licenseRowActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  licenseCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textFaint,
    marginRight: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  licenseCheckInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  licenseInfo: {
    flex: 1,
    gap: 2,
  },
  licenseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  licenseTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  recommendBadge: {
    backgroundColor: colors.tertiary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  recommendText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
  },
  licenseTerms: {
    color: colors.textMuted,
    fontSize: 11,
  },
  licensePrice: {
    color: colors.tertiary,
    fontWeight: '800',
    fontSize: 16,
    marginLeft: spacing.sm,
  },
  checkoutBtn: {
    borderRadius: radius.md,
    overflow: 'hidden',
    shadowColor: colors.tertiary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginTop: spacing.xs,
  },
  checkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  checkoutText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },

  // Tags
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tagText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },

  // Similar
  similarSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  similarScroll: {
    marginHorizontal: -spacing.lg,
  },
  similarScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  similarCard: {
    width: 148,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  similarArtwork: {
    width: '100%',
    height: 76,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  similarInitial: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 28,
    fontWeight: '800',
  },
  similarTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  similarMeta: {
    color: colors.textFaint,
    fontSize: 10,
    marginTop: 2,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  similarityBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  similarityFill: {
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  similarityLabel: {
    color: colors.accent,
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
