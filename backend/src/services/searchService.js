const beatStore = require('./beatStore');
const { meaningfulTokens, expandQuery } = require('../utils/textUtils');

/**
 * Search strategy
 * ----------------
 * 1. Exact/substring matching against structured fields (title, producer,
 *    genre, mood, tags) gets the highest weight - this handles the core
 *    requirement precisely.
 * 2. Natural language queries are expanded via `expandQuery` into implied
 *    genres/moods/tags (e.g. "dark travis scott type beat" -> genre: Trap,
 *    mood: Dark, tags: [dark, synth, 808]) and scored the same way, just
 *    with a slightly lower weight since it's an inferred match rather
 *    than a literal one.
 * 3. Free-text leftover tokens are matched against the description as a
 *    fallback so odd phrasing still returns something reasonable.
 *
 * Every match accumulates a score; results are sorted descending by score
 * (ties broken by play count) so the "most relevant" beats surface first.
 */

const WEIGHTS = {
  titleExact: 10,
  titleContains: 6,
  producerExact: 8,
  producerContains: 5,
  genreExact: 7,
  moodExact: 7,
  tagExact: 5,
  descriptionContains: 2,
  nlpGenre: 4,
  nlpMood: 4,
  nlpTag: 3,
};

function search(query, { limit = 50 } = {}) {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return [];
  }

  const lowerQuery = trimmed.toLowerCase();
  const rawTokens = meaningfulTokens(trimmed);
  const { genres, moods, tags, freeTokens } = expandQuery(trimmed);

  const scored = [];

  for (const beat of beatStore.getAllRaw()) {
    let score = 0;
    const matchedOn = new Set();

    // --- Direct structured field matching ---
    if (beat._titleLower === lowerQuery) {
      score += WEIGHTS.titleExact;
      matchedOn.add('title');
    } else if (beat._titleLower.includes(lowerQuery)) {
      score += WEIGHTS.titleContains;
      matchedOn.add('title');
    }

    if (beat._producerLower === lowerQuery) {
      score += WEIGHTS.producerExact;
      matchedOn.add('producer');
    } else if (beat._producerLower.includes(lowerQuery)) {
      score += WEIGHTS.producerContains;
      matchedOn.add('producer');
    }

    if (beat._genreLower === lowerQuery || rawTokens.some((t) => beat._genreLower.includes(t))) {
      score += WEIGHTS.genreExact;
      matchedOn.add('genre');
    }

    if (beat._moodLower === lowerQuery || rawTokens.some((t) => beat._moodLower.includes(t))) {
      score += WEIGHTS.moodExact;
      matchedOn.add('mood');
    }

    for (const token of rawTokens) {
      if (beat._tagsLower.includes(token)) {
        score += WEIGHTS.tagExact;
        matchedOn.add('tags');
      }
    }

    if (beat._descriptionLower.includes(lowerQuery)) {
      score += WEIGHTS.descriptionContains;
      matchedOn.add('description');
    }

    // --- Natural language expansion matching ---
    if (genres.has(beat.genre)) {
      score += WEIGHTS.nlpGenre;
      matchedOn.add('genre (inferred)');
    }
    if (moods.has(beat.mood)) {
      score += WEIGHTS.nlpMood;
      matchedOn.add('mood (inferred)');
    }
    for (const tag of tags) {
      if (beat._tagsLower.includes(tag)) {
        score += WEIGHTS.nlpTag;
        matchedOn.add('tags (inferred)');
      }
    }

    // --- Leftover free tokens against description/title as a fallback ---
    for (const token of freeTokens) {
      if (beat._descriptionLower.includes(token) || beat._titleLower.includes(token)) {
        score += WEIGHTS.descriptionContains;
        matchedOn.add('description');
      }
    }

    if (score > 0) {
      scored.push({ beat, score, matchedOn: [...matchedOn] });
    }
  }

  scored.sort((a, b) => b.score - a.score || b.beat.plays - a.beat.plays);

  return scored.slice(0, limit).map(({ beat, score, matchedOn }) => ({
    ...beatStore._clean(beat),
    _relevance: score,
    _matchedOn: matchedOn,
  }));
}

module.exports = { search };
