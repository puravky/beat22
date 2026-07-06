import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'beat22:userId';

// Generates a simple, sufficiently-unique anonymous id. We intentionally
// avoid pulling in a uuid library for one function - Math.random + time
// is more than enough entropy for an anonymous, per-device session id.
function generateId() {
  return `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

let cachedUserId = null;

/**
 * Returns a stable anonymous user id for this device/install, creating
 * and persisting one on first launch. This id is sent as the `x-user-id`
 * header on every API request so the backend can build a personalized
 * taste profile (searches + views) for the recommendation engine -
 * without requiring any real authentication system for this assignment.
 */
export async function getUserId() {
  if (cachedUserId) return cachedUserId;

  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    cachedUserId = stored;
    return stored;
  }

  const newId = generateId();
  await AsyncStorage.setItem(STORAGE_KEY, newId);
  cachedUserId = newId;
  return newId;
}
