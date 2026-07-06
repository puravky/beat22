/**
 * InteractionService
 * -------------------
 * Tracks per-user interaction history (searches performed, beats viewed)
 * in memory, keyed by a client-generated userId (see mobile app's
 * `userId` util - a random id persisted in AsyncStorage on first launch).
 *
 * There's no login system in this assignment, so a lightweight anonymous
 * identifier is the pragmatic choice. This is an in-memory store, which is
 * fine for a take-home assignment / demo; swapping this for Redis or a
 * database table is a drop-in replacement since every method here is
 * already isolated behind a small interface.
 */

const MAX_HISTORY = 30;

class InteractionService {
  constructor() {
    this.userHistories = new Map(); // userId -> { searches: [], views: [] }
  }

  _getOrCreate(userId) {
    if (!this.userHistories.has(userId)) {
      this.userHistories.set(userId, { searches: [], views: [] });
    }
    return this.userHistories.get(userId);
  }

  recordSearch(userId, query) {
    if (!userId || !query) return;
    const history = this._getOrCreate(userId);
    history.searches.unshift({ query, timestamp: Date.now() });
    history.searches = history.searches.slice(0, MAX_HISTORY);
  }

  recordView(userId, beatId) {
    if (!userId || !beatId) return;
    const history = this._getOrCreate(userId);
    // Move to front if already viewed, avoiding duplicate clutter.
    history.views = history.views.filter((v) => v.beatId !== beatId);
    history.views.unshift({ beatId, timestamp: Date.now() });
    history.views = history.views.slice(0, MAX_HISTORY);
  }

  getHistory(userId) {
    return this._getOrCreate(userId);
  }

  hasHistory(userId) {
    const h = this.userHistories.get(userId);
    return !!h && (h.searches.length > 0 || h.views.length > 0);
  }
}

module.exports = new InteractionService();
