/**
 * Small, dependency-free text utilities used by the search and
 * recommendation engines. No external NLP library is used on purpose -
 * the dataset and query vocabulary are small enough that a lightweight
 * keyword/synonym approach is fast, predictable and easy to reason about.
 */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'for', 'and', 'or', 'of', 'in', 'on', 'with',
  'type', 'beat', 'beats', 'style', 'like', 'me', 'find', 'give',
  'some', 'please', 'i', 'want', 'need', 'looking', 'to', 'is',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function meaningfulTokens(text) {
  return tokenize(text).filter((t) => !STOPWORDS.has(t));
}

// Jaccard similarity between two arrays treated as sets.
function jaccardSimilarity(a = [], b = []) {
  if (!a.length && !b.length) return 0;
  const setA = new Set(a.map((x) => x.toLowerCase()));
  const setB = new Set(b.map((x) => x.toLowerCase()));
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * A small synonym/association map used to bridge free-text natural
 * language queries (e.g. "dark travis scott type beat") to the
 * structured vocabulary that actually exists in the dataset
 * (moods, genres, tags). This is what powers the "good to have"
 * natural language search without needing an external LLM call.
 */
const ASSOCIATIONS = {
  // Artist / producer style references -> closest genre+mood+tag signals.
  'travis': { genre: ['Trap', 'Melodic Trap'], tags: ['dark', 'synth', '808'], mood: ['Dark'] },
  'scott': { genre: ['Trap', 'Melodic Trap'], tags: ['dark', 'synth', '808'], mood: ['Dark'] },
  'drake': { genre: ['R&B', 'Hip Hop'], tags: ['melodic', 'emotional'], mood: ['Emotional'] },
  'future': { genre: ['Trap'], tags: ['dark', '808', 'hard'], mood: ['Dark'] },
  'drill': { genre: ['Drill'], tags: ['drill', 'dark', 'hard'], mood: ['Dark', 'Aggressive'] },
  'afrobeat': { genre: ['Afrobeats'], tags: ['afro', 'summer'], mood: ['Happy'] },
  'afro': { genre: ['Afrobeats'], tags: ['afro', 'summer'], mood: ['Happy'] },
  'boom': { genre: ['Boom Bap'], tags: ['sample', 'drums'] },
  'bap': { genre: ['Boom Bap'], tags: ['sample', 'drums'] },
  'lofi': { genre: ['Lo-Fi'], tags: ['lofi', 'ambient'] },
  'lo-fi': { genre: ['Lo-Fi'], tags: ['lofi', 'ambient'] },
  'piano': { tags: ['piano', 'emotional'], mood: ['Emotional', 'Melancholic'] },
  'emotional': { mood: ['Emotional'], tags: ['emotional', 'piano'] },
  'sad': { mood: ['Melancholic'], tags: ['sad', 'emotional'] },
  'happy': { mood: ['Happy'], tags: ['happy', 'summer', 'bounce'] },
  'dark': { mood: ['Dark'], tags: ['dark', 'hard'] },
  'chill': { mood: ['Chill'], tags: ['lofi', 'ambient', 'dreamy'] },
  'aggressive': { mood: ['Aggressive'], tags: ['hard', 'drill'] },
  'hard': { mood: ['Aggressive'], tags: ['hard'] },
  'club': { tags: ['club', 'bounce'], genre: ['Pop', 'Dancehall'] },
  'summer': { tags: ['summer'], mood: ['Happy'] },
  'dreamy': { mood: ['Dreamy'], tags: ['dreamy', 'ambient', 'reverb'] },
  'cinematic': { mood: ['Cinematic'], tags: ['cinematic', 'strings'] },
  'uplifting': { mood: ['Uplifting'], tags: ['anthem', 'bells'] },
  'energetic': { mood: ['Energetic'], tags: ['bounce', 'club'] },
  'trap': { genre: ['Trap', 'Melodic Trap'], tags: ['trap', '808'] },
  'rnb': { genre: ['R&B'] },
  'r&b': { genre: ['R&B'] },
  'pop': { genre: ['Pop'] },
  'dancehall': { genre: ['Dancehall'] },
  'phonk': { tags: ['phonk'], genre: ['Trap', 'Drill'] },
};

/**
 * Expands a raw natural-language query into a structured signal bag:
 * { genres: Set, moods: Set, tags: Set, freeTokens: [] }
 * Any token not found in ASSOCIATIONS is kept as a free token to be
 * matched literally against titles/producers/descriptions.
 */
function expandQuery(query) {
  const tokens = meaningfulTokens(query);
  const genres = new Set();
  const moods = new Set();
  const tags = new Set();
  const freeTokens = [];

  for (const token of tokens) {
    const assoc = ASSOCIATIONS[token];
    if (assoc) {
      (assoc.genre || []).forEach((g) => genres.add(g));
      (assoc.mood || []).forEach((m) => moods.add(m));
      (assoc.tags || []).forEach((t) => tags.add(t));
    } else {
      freeTokens.push(token);
    }
  }

  return { tokens, genres, moods, tags, freeTokens };
}

module.exports = {
  tokenize,
  meaningfulTokens,
  jaccardSimilarity,
  expandQuery,
};
