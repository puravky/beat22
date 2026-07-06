# Beat22 - Beat Discovery App

A React Native (Expo) app + Node.js/Express backend for discovering music beats via search and a personalized recommendation engine.

---

## 🚀 Deployed Backend Links
- **Live Backend URL:** [beat22-backend](https://beat22-backend.onrender.com)
- **API Base URL:** [beat22-api](https://beat22-backend.onrender.com/api)
- **Health Check Endpoint:** [beat22-health](https://beat22-backend.onrender.com/health)

---

## 📱 How to See the Frontend
The frontend is built with React Native (Expo) and can be accessed in three ways:

### 1. Expo Go (Recommended for Mobile)
1. Install the **Expo Go** app on your iOS or Android device.
2. In the `mobile/` directory, run:
   ```bash
   bun start
   ```
3. Scan the generated QR code in your terminal with your phone's camera (iOS) or the Expo Go app (Android).
4. Make sure your phone and development machine are on the same Wi-Fi network.

### 2. Web Browser (Local Web View)
1. Run `bun start` in the `mobile/` directory.
2. Press `w` in your terminal to open the application in your local web browser.

### 3. Production Web Deployment (Vercel)
The mobile app is pre-configured for static hosting on Vercel:
- **Build Command:** `bun run build:web`
- **Vercel Config:** Already included in [mobile/vercel.json](file:///Users/async/Downloads/beat22/mobile/vercel.json)
- To deploy, import the `mobile/` subdirectory to Vercel and configure the `EXPO_PUBLIC_API_URL` environment variable to point to your deployed backend URL.

---

## ⚙️ Project Setup

### Prerequisites
- [Bun](https://bun.sh) >= 1.0
- Expo Go app on your phone, or an iOS/Android simulator

### 1. Running the Backend
```bash
cd backend
bun install
bun run dev  # Starts the server on http://localhost:4000 with auto-restart
```

### 2. Running the Mobile App
1. Copy the environment template and set your API endpoint:
   ```bash
   cd mobile
   cp .env.example .env
   ```
2. Edit `mobile/.env` and set `EXPO_PUBLIC_API_URL`.
   - Use `http://localhost:4000/api` when testing in a web browser.
   - Use your machine's LAN IP (e.g., `http://192.168.1.XX:4000/api`) when testing on a physical device via Expo Go.
   - Or use the deployed backend URL: `https://beat22-backend.onrender.com/api`.
3. Install dependencies and start:
   ```bash
   bun install
   bun start
   ```

---

## 📂 Project Architecture
The project follows a clean service-oriented architecture:
- **Backend Service (`backend/`):** Express API powered by Bun. Logic is segregated from routing into pure services.
  - [src/services/recommendationService.js](file:///Users/async/Downloads/beat22/backend/src/services/recommendationService.js) — Content-based recommendation engine.
  - [src/services/embeddingService.js](file:///Users/async/Downloads/beat22/backend/src/services/embeddingService.js) — TF-IDF text vectorization and cosine similarity.
  - [src/services/searchService.js](file:///Users/async/Downloads/beat22/backend/src/services/searchService.js) — Metadata-weighted search with natural language expansion.
  - [src/services/interactionService.js](file:///Users/async/Downloads/beat22/backend/src/services/interactionService.js) — In-memory history tracking per user.
- **Mobile Frontend (`mobile/`):** React Native (Expo) app using React Navigation and a custom dark theme.
  - [src/screens/](file:///Users/async/Downloads/beat22/mobile/src/screens) — HomeScreen, BeatDetailsScreen, TrendingScreen, SearchScreen.
  - [src/theme/theme.js](file:///Users/async/Downloads/beat22/mobile/src/theme/theme.js) — Dark theme configurations.
  - [src/api/client.js](file:///Users/async/Downloads/beat22/mobile/src/api/client.js) — API client with anonymous user tracking header.

---

## 📡 API Documentation
Base URL: `https://beat22-backend.onrender.com/api` (or `http://localhost:4000/api` locally).
All endpoints accept an optional `x-user-id` header (anonymous device-generated ID) to track user interactions for recommendations.

- **`GET /beats`**: Returns all beats in the dataset.
- **`GET /beats/:id`**: Returns details for a specific beat. Records a view event for recommendations.
- **`GET /beats/:id/similar`**: Content-based "more like this" using TF-IDF cosine similarity.
- **`GET /search?q=<query>`**: Weighted search across title, producer, genre, mood, tags, and description.
- **`GET /recommendations`**: Personalized recommendations based on user history, or trending/popular beats for new users.

---

## 🔍 Search Implementation
- **Metadata Weighting:** Results are scored and ranked based on field matching weights (exact title match = 10, producer = 8/5, genre/mood = 7, tags = 5, description = 2).
- **Natural Language Expansion:** Common terms (e.g., "Travis Scott type beat", "emotional piano") are automatically expanded using a local synonym map in [textUtils.js](file:///Users/async/Downloads/beat22/backend/src/utils/textUtils.js), matching them to structured genres, moods, and tags without external API latency.

---

## 🎯 Recommendation Implementation
- **Session-Based Taste Profile:** Builds a real-time taste profile for each user based on their recent searches and views.
- **TF-IDF & Cosine Similarity:** Computes TF-IDF vectors for beats and compares them against the user's taste vector to find relevant, context-rich recommendations.
- **Recency Decay:** Multiplies interaction weights by a decay factor (`0.85^index`) so recent interactions carry more weight.
- **Diversity Cap:** Restricts recommendations to a maximum of 3 beats per genre to avoid repetitive lists.
- **Explainable Reasons:** Every recommendation includes a human-readable reason detailing *why* it was recommended (e.g., *"You've shown interest in Trap, and you tend to like Dark beats"*).

---

## 💡 Engineering Decisions & Assumptions
- **Anonymous Identity:** Used an AsyncStorage-based UUID instead of a full authentication flow, satisfying personalization requirements without over-engineering.
- **In-Memory Storage:** The 100-item dataset and interaction history are kept in-memory for zero external dependencies, rapid responses, and simple deployment.
- **Local Text Processing:** Implemented classical TF-IDF and a local synonym map instead of calling external LLMs/embedding APIs to ensure instant, free, and deterministic results.
- **Thin Routes / Fat Services:** Business logic is decoupled from Express handlers, making modules unit-testable and reusable.

---

## 🚀 Future Improvements
- **Database Integration:** Move the beat catalog and interaction history to a persistent store (PostgreSQL + Redis).
- **Neural Embeddings:** Replace the TF-IDF vectors with a neural embeddings API (e.g., OpenAI/Cohere) for deeper semantic search.
- **Collaborative Filtering:** Implement hybrid recommendations once a multi-user dataset is available.
- **Negative Feedback Loop:** Add a "dismiss/dislike" signal to refine user recommendations further.
