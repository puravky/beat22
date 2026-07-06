const fs = require('fs');
const path = require('path');

/**
 * BeatStore
 * ----------
 * Loads the beats dataset once at startup and keeps it in memory.
 * This is intentionally a simple in-memory store (no DB) since the
 * assignment ships a static JSON dataset. Swapping this out for a
 * real database later only requires changing this one module -
 * every other part of the app depends on the interface below, not
 * on the storage mechanism.
 */
class BeatStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.beats = [];
    this.beatsById = new Map();
    this.load();
  }

  load() {
    const raw = fs.readFileSync(this.filePath, 'utf-8');
    const parsed = JSON.parse(raw);

    this.beats = parsed.map((beat) => ({
      ...beat,
      // Normalize for fast, case-insensitive matching later.
      _titleLower: beat.title.toLowerCase(),
      _producerLower: beat.producer.toLowerCase(),
      _genreLower: beat.genre.toLowerCase(),
      _moodLower: beat.mood.toLowerCase(),
      _tagsLower: beat.tags.map((t) => t.toLowerCase()),
      _descriptionLower: beat.description.toLowerCase(),
    }));

    this.beatsById = new Map(this.beats.map((b) => [b.id, b]));
  }

  getAll() {
    return this.beats.map(this._clean);
  }

  getById(id) {
    const beat = this.beatsById.get(Number(id));
    return beat ? this._clean(beat) : null;
  }

  // Returns the raw, internal beat objects (with lowercase fields).
  // Used internally by search/recommendation services that need the
  // pre-computed lowercase fields for performance.
  getAllRaw() {
    return this.beats;
  }

  getAllGenres() {
    return [...new Set(this.beats.map((b) => b.genre))];
  }

  getAllMoods() {
    return [...new Set(this.beats.map((b) => b.mood))];
  }

  // Strip internal helper fields before returning to API consumers.
  _clean(beat) {
    const {
      _titleLower,
      _producerLower,
      _genreLower,
      _moodLower,
      _tagsLower,
      _descriptionLower,
      ...clean
    } = beat;
    return clean;
  }
}

module.exports = new BeatStore(path.join(__dirname, '..', '..', 'data', 'beats.json'));
