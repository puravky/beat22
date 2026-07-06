const beatStore = require('./beatStore');
const { tokenize } = require('../utils/textUtils');

/**
 * EmbeddingService
 * =================
 * Provides vector-based semantic similarity between beats (and between
 * a free-text query / a user's taste profile and beats), using TF-IDF
 * vectorization + cosine similarity.
 *
 * Why TF-IDF instead of a neural embedding API (OpenAI/Cohere/etc.)?
 * This project has no configured embedding API key, and faking that
 * call would be dishonest about what's actually running. TF-IDF is a
 * real, well-understood embedding technique: it turns each beat's text
 * into a vector in a shared vocabulary space, weighted so common words
 * ("the", "beat") contribute little and distinctive words ("phonk",
 * "melancholic", "aether") contribute a lot. Cosine similarity between
 * two such vectors is a legitimate measure of semantic closeness for a
 * catalog this size (100 items, a few hundred vocabulary terms).
 *
 * SWAP-IN POINT: to upgrade to neural embeddings, replace `embedText()`
 * below with a call to an embeddings API (e.g. Anthropic/OpenAI/Cohere),
 * cache the resulting vectors the same way, and everything downstream
 * (cosineSimilarity, getSimilarBeats, embedding-informed recommendations)
 * keeps working unchanged - the rest of the system only depends on
 * "text in, fixed-length vector out."
 */
class EmbeddingService {
  constructor() {
    this.vocabulary = new Map(); // term -> index
    this.idf = [];               // index -> idf weight
    this.beatVectors = new Map(); // beatId -> Float64Array
    this._build();
  }

  _documentText(beat) {
    // Repeat structured fields so they carry more weight than the
    // free-form description in the resulting vector - title/genre/mood
    // are more reliable similarity signals than prose.
    return [
      beat.title, beat.title,
      beat.producer, beat.producer,
      beat.genre, beat.genre, beat.genre,
      beat.mood, beat.mood, beat.mood,
      ...beat.tags, ...beat.tags,
      beat.description,
    ].join(' ');
  }

  _build() {
    const beats = beatStore.getAllRaw();
    const docTokens = beats.map((b) => tokenize(this._documentText(b)));

    // Build vocabulary + document frequency.
    const docFreq = new Map();
    docTokens.forEach((tokens) => {
      const seen = new Set(tokens);
      seen.forEach((term) => {
        docFreq.set(term, (docFreq.get(term) || 0) + 1);
        if (!this.vocabulary.has(term)) {
          this.vocabulary.set(term, this.vocabulary.size);
        }
      });
    });

    const N = beats.length;
    this.idf = new Array(this.vocabulary.size);
    for (const [term, index] of this.vocabulary.entries()) {
      // Smoothed IDF so terms appearing in every doc don't hit zero.
      this.idf[index] = Math.log((N + 1) / (docFreq.get(term) + 1)) + 1;
    }

    // Build a TF-IDF vector per beat.
    beats.forEach((beat, i) => {
      const tokens = docTokens[i];
      const termCounts = new Map();
      tokens.forEach((t) => termCounts.set(t, (termCounts.get(t) || 0) + 1));

      const vec = new Float64Array(this.vocabulary.size);
      termCounts.forEach((count, term) => {
        const index = this.vocabulary.get(term);
        const tf = count / tokens.length;
        vec[index] = tf * this.idf[index];
      });

      this.beatVectors.set(beat.id, this._normalize(vec));
    });
  }

  _normalize(vec) {
    let sumSq = 0;
    for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i];
    const norm = Math.sqrt(sumSq) || 1;
    const out = new Float64Array(vec.length);
    for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
    return out;
  }

  /** Embeds arbitrary free text into the same vector space as beats. */
  embedText(text) {
    const tokens = tokenize(text);
    const vec = new Float64Array(this.vocabulary.size);
    const termCounts = new Map();
    tokens.forEach((t) => termCounts.set(t, (termCounts.get(t) || 0) + 1));

    termCounts.forEach((count, term) => {
      if (!this.vocabulary.has(term)) return; // out-of-vocabulary, ignore
      const index = this.vocabulary.get(term);
      const tf = count / tokens.length;
      vec[index] = tf * this.idf[index];
    });

    return this._normalize(vec);
  }

  getBeatVector(beatId) {
    return this.beatVectors.get(beatId);
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) dot += vecA[i] * vecB[i];
    return dot; // both vectors are already unit-normalized
  }

  /**
   * Returns the topN beats most semantically similar to a given beat,
   * excluding itself. Powers "similar beats" on the details screen and
   * contributes an embedding-similarity signal to recommendations.
   */
  getSimilarBeats(beatId, topN = 5) {
    const source = this.getBeatVector(beatId);
    if (!source) return [];

    const scored = [];
    for (const [id, vec] of this.beatVectors.entries()) {
      if (id === beatId) continue;
      scored.push({ id, score: this.cosineSimilarity(source, vec) });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN);
  }

  /**
   * Builds a single "taste vector" for a user by averaging the vectors
   * of beats they've viewed, weighted by recency (index 0 = most
   * recent). Used to rank all beats by semantic closeness to what a
   * user has actually engaged with - this is the embedding-based
   * counterpart to the heuristic genre/mood/tag scoring in
   * recommendationService.js, and the two are blended there.
   */
  embedUserHistory(viewedBeatIds) {
    if (!viewedBeatIds.length) return null;
    const dims = this.vocabulary.size;
    const acc = new Float64Array(dims);
    let totalWeight = 0;

    viewedBeatIds.forEach((beatId, index) => {
      const vec = this.getBeatVector(beatId);
      if (!vec) return;
      const weight = Math.pow(0.85, index);
      for (let i = 0; i < dims; i++) acc[i] += vec[i] * weight;
      totalWeight += weight;
    });

    if (totalWeight === 0) return null;
    for (let i = 0; i < dims; i++) acc[i] /= totalWeight;
    return this._normalize(acc);
  }
}

module.exports = new EmbeddingService();
