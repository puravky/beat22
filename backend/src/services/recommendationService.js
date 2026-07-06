const beatStore = require('./beatStore');
const interactionService = require('./interactionService');
const embeddingService = require('./embeddingService');
const { expandQuery } = require('../utils/textUtils');

/**
 * Recommendation Engine
 * ======================
 * This is a content-based, explainable recommender. There's no
 * collaborative filtering (not enough users/data for that to make sense
 * in a 100-item, single-session demo), so the strategy instead builds a
 * lightweight "taste profile" per anonymous user from their own recent
 * behaviour and scores every candidate beat against that profile.
 *
 * Signals that build the profile:
 *   1. Viewed beats       (strongest signal - explicit interest)
 *   2. Past searches       (expanded via the same NLP association map
 *                           used by search, so "dark trap" search pushes
 *                           the profile toward Trap/Dark just like a view
 *                           of a Trap/Dark beat would)
 *
 * Recency weighting: more recent actions count more (exponential decay),
 * so recommendations adapt as the user's taste shifts within a session.
 *
 * Scoring a candidate beat combines:
 *   - genre affinity
 *   - mood affinity
 *   - tag overlap (jaccard-style contribution, weighted by profile tag scores)
 *   - producer affinity (do they keep coming back to one producer?)
 *   - embedding similarity: cosine similarity between the candidate
 *     beat's TF-IDF vector and a "taste vector" built from the user's
 *     viewed beats (see embeddingService.js). This is the engine's
 *     semantic-retrieval signal - it can surface beats that are a good
 *     match by overall theme/description even when they don't share an
 *     exact genre, mood, or tag with anything the user has seen.
 *   - a small popularity prior (plays/likes) so ties resolve sensibly and
 *     cold-start users still get a good first impression
 *
 * Diversity guard: after scoring, we cap how many beats from the same
 * genre can appear in the final list so recommendations don't collapse
 * into "10 near-identical Trap beats."
 *
 * Every recommendation ships with a human-readable `reason` string
 * describing which signal(s) drove it - this is a hard requirement of
 * the assignment, not an afterthought.
 */

const DECAY = 0.85;
const MAX_PER_GENRE = 3;

function decayWeight(index) {
  return Math.pow(DECAY, index);
}

function buildUserProfile(userId) {
  const history = interactionService.getHistory(userId);
  const genreScores = {};
  const moodScores = {};
  const tagScores = {};
  const producerScores = {};

  history.views.forEach((view, index) => {
    const beat = beatStore.getAllRaw().find((b) => b.id === view.beatId);
    if (!beat) return;
    const w = decayWeight(index);
    genreScores[beat.genre] = (genreScores[beat.genre] || 0) + w * 3;
    moodScores[beat.mood] = (moodScores[beat.mood] || 0) + w * 3;
    producerScores[beat.producer] = (producerScores[beat.producer] || 0) + w * 1.5;
    beat.tags.forEach((tag) => {
      tagScores[tag] = (tagScores[tag] || 0) + w * 2;
    });
  });

  history.searches.forEach((s, index) => {
    const { genres, moods, tags } = expandQuery(s.query);
    const w = decayWeight(index);
    genres.forEach((g) => {
      genreScores[g] = (genreScores[g] || 0) + w * 2;
    });
    moods.forEach((m) => {
      moodScores[m] = (moodScores[m] || 0) + w * 2;
    });
    tags.forEach((t) => {
      tagScores[t] = (tagScores[t] || 0) + w * 1.5;
    });
  });

  const viewedIdsOrdered = history.views.map((v) => v.beatId);

  return {
    genreScores,
    moodScores,
    tagScores,
    producerScores,
    viewedIds: new Set(viewedIdsOrdered),
    // A single vector representing the user's taste, built by averaging
    // (recency-weighted) the TF-IDF embeddings of beats they've viewed.
    // Null when the user hasn't viewed anything yet (searches alone
    // aren't enough text to build a meaningful embedding from).
    embeddingVector: embeddingService.embedUserHistory(viewedIdsOrdered),
    hasSignal:
      Object.keys(genreScores).length > 0 ||
      Object.keys(moodScores).length > 0 ||
      Object.keys(tagScores).length > 0,
  };
}

function popularityScore(beat, allBeats) {
  const maxPlays = Math.max(...allBeats.map((b) => b.plays), 1);
  const maxLikes = Math.max(...allBeats.map((b) => b.likes), 1);
  return 0.5 * (beat.plays / maxPlays) + 0.5 * (beat.likes / maxLikes);
}

function scoreBeat(beat, profile, allBeats) {
  const genreScore = profile.genreScores[beat.genre] || 0;
  const moodScore = profile.moodScores[beat.mood] || 0;
  const producerScore = profile.producerScores[beat.producer] || 0;
  const tagScore = beat.tags.reduce((sum, t) => sum + (profile.tagScores[t] || 0), 0);
  const popularity = popularityScore(beat, allBeats);

  // Embedding similarity: cosine similarity (0-1) between this beat's
  // TF-IDF vector and the user's taste vector (built from their viewed
  // beats). This captures semantic closeness the heuristic genre/mood/
  // tag scores can miss - e.g. two beats in different genres whose
  // descriptions both evoke "late night drives" will score close here
  // even though genreScore would be 0 for one relative to the other.
  const embeddingScore = profile.embeddingVector
    ? embeddingService.cosineSimilarity(profile.embeddingVector, embeddingService.getBeatVector(beat.id))
    : 0;

  const total =
    genreScore * 1.0 +
    moodScore * 1.0 +
    tagScore * 0.6 +
    producerScore * 0.4 +
    embeddingScore * 2.5 +
    popularity * 0.15;

  return { genreScore, moodScore, producerScore, tagScore, embeddingScore, popularity, total };
}

function buildReason(beat, breakdown, profile) {
  const reasons = [];

  const topTags = beat.tags
    .filter((t) => (profile.tagScores[t] || 0) > 0)
    .slice(0, 2);

  // Surface the embedding signal first when it's genuinely the
  // strongest contributor - this is the case a heuristic-only version
  // of the engine would have no way to explain (e.g. two beats with
  // different genres/tags but closely related descriptions).
  const isEmbeddingDominant =
    breakdown.embeddingScore > 0.15 &&
    breakdown.embeddingScore * 2.5 >= Math.max(breakdown.genreScore, breakdown.moodScore, breakdown.tagScore * 0.6);

  if (isEmbeddingDominant) {
    reasons.push('its overall sound and description closely match beats you\'ve explored');
  }
  if (breakdown.genreScore > 0) {
    reasons.push(`you've shown interest in ${beat.genre}`);
  }
  if (breakdown.moodScore > 0) {
    reasons.push(`you tend to like ${beat.mood} beats`);
  }
  if (topTags.length) {
    reasons.push(`shares tags (${topTags.join(', ')}) with beats you've explored`);
  }
  if (breakdown.producerScore > 0) {
    reasons.push(`you've engaged with producer ${beat.producer} before`);
  }

  if (reasons.length === 0) {
    return `Trending pick - popular with other listeners (${beat.plays.toLocaleString()} plays)`;
  }

  const primary = reasons[0];
  const capitalized = primary.charAt(0).toUpperCase() + primary.slice(1);
  return reasons.length > 1 ? `${capitalized}, and ${reasons.slice(1).join(', and ')}` : capitalized;
}

function trendingRecommendations(limit, excludeIds = new Set()) {
  const allBeats = beatStore.getAllRaw();
  return allBeats
    .filter((b) => !excludeIds.has(b.id))
    .map((beat) => ({
      beat,
      total: popularityScore(beat, allBeats),
      reason: `Trending pick - popular with other listeners (${beat.plays.toLocaleString()} plays, ${beat.likes.toLocaleString()} likes)`,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map(({ beat, reason }) => ({
      ...beatStore._clean(beat),
      reason,
      strategy: 'trending',
    }));
}

function recommend(userId, { limit = 10 } = {}) {
  const allBeats = beatStore.getAllRaw();
  const profile = buildUserProfile(userId);

  if (!profile.hasSignal) {
    return {
      strategy: 'cold_start_trending',
      recommendations: trendingRecommendations(limit),
    };
  }

  const scored = allBeats
    .filter((beat) => !profile.viewedIds.has(beat.id))
    .map((beat) => {
      const breakdown = scoreBeat(beat, profile, allBeats);
      return {
        beat,
        breakdown,
        reason: buildReason(beat, breakdown, profile),
      };
    })
    .filter((entry) => entry.breakdown.total > 0)
    .sort((a, b) => b.breakdown.total - a.breakdown.total);

  // Diversity guard: cap results per genre so the list isn't monotone.
  const genreCounts = {};
  const diversified = [];
  for (const entry of scored) {
    const g = entry.beat.genre;
    genreCounts[g] = genreCounts[g] || 0;
    if (genreCounts[g] >= MAX_PER_GENRE) continue;
    genreCounts[g] += 1;
    diversified.push(entry);
    if (diversified.length >= limit) break;
  }

  // Backfill with trending beats if the profile-based list is too short
  // (e.g. very sparse history).
  if (diversified.length < limit) {
    const have = new Set([...profile.viewedIds, ...diversified.map((d) => d.beat.id)]);
    const backfill = trendingRecommendations(limit - diversified.length, have);
    return {
      strategy: 'personalized_with_trending_backfill',
      recommendations: [
        ...diversified.map(({ beat, reason }) => ({
          ...beatStore._clean(beat),
          reason,
          strategy: 'personalized',
        })),
        ...backfill,
      ],
    };
  }

  return {
    strategy: 'personalized',
    recommendations: diversified.map(({ beat, reason }) => ({
      ...beatStore._clean(beat),
      reason,
      strategy: 'personalized',
    })),
  };
}

/**
 * Pure embedding-based item-item similarity - "more beats like this one",
 * independent of any user profile. Powers a "Similar Beats" section on
 * the Beat Details screen.
 */
function similarBeats(beatId, limit = 5) {
  const matches = embeddingService.getSimilarBeats(Number(beatId), limit);
  return matches
    .map(({ id, score }) => {
      const beat = beatStore.getById(id);
      if (!beat) return null;
      return { ...beat, similarity: Number(score.toFixed(3)) };
    })
    .filter(Boolean);
}

module.exports = { recommend, buildUserProfile, similarBeats };
