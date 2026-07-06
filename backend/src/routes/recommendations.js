const express = require('express');
const recommendationService = require('../services/recommendationService');

const router = express.Router();

// GET /api/recommendations - personalized recommendations for the
// requesting user (identified by the x-user-id header). Falls back to
// trending beats for anonymous / first-time users (cold start).
router.get('/', (req, res) => {
  const userId = req.header('x-user-id') || null;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 30);

  const { strategy, recommendations } = recommendationService.recommend(userId, { limit });

  res.json({ data: recommendations, strategy, count: recommendations.length });
});

module.exports = router;
