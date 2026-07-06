import axios from 'axios';
import { getUserId } from '../utils/userId';

// Reads from an EXPO_PUBLIC_API_URL environment variable (set in a
// `.env` file at the mobile/ root, e.g. EXPO_PUBLIC_API_URL=https://your-backend.onrender.com/api)
// so the same code works locally and against a deployed backend without
// editing source. Falls back to localhost for local dev if unset.
//
// IMPORTANT: When running on a physical device or Android emulator,
// 'localhost' will not point at your dev machine - use your machine's
// LAN IP (e.g. http://192.168.1.5:4000/api) or a deployed backend URL.
// See README for details.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Attach the anonymous user id to every request so the backend can
// track interactions (searches/views) per user for recommendations.
client.interceptors.request.use(async (config) => {
  const userId = await getUserId();
  config.headers['x-user-id'] = userId;
  return config;
});

export async function fetchAllBeats() {
  const { data } = await client.get('/beats');
  return data.data;
}

export async function fetchBeatById(id) {
  const { data } = await client.get(`/beats/${id}`);
  return data.data;
}

export async function searchBeats(query) {
  const { data } = await client.get('/search', { params: { q: query } });
  return data.data;
}

export async function fetchRecommendations(limit = 10) {
  const { data } = await client.get('/recommendations', { params: { limit } });
  return data;
}

// Embedding-based "more like this" for the Beat Details screen.
export async function fetchSimilarBeats(id, limit = 5) {
  const { data } = await client.get(`/beats/${id}/similar`, { params: { limit } });
  return data.data;
}

export default client;
