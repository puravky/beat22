const express = require('express');
const searchService = require('../services/searchService');
const interactionService = require('../services/interactionService');

const router = express.Router();

// GET /api/search?q=<query>
router.get('/', (req, res) => {
  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const results = searchService.search(q);

  // Record the search for the recommendation engine, if a user id was sent.
  const userId = req.header('x-user-id');
  if (userId) {
    interactionService.recordSearch(userId, q);
  }

  res.json({ data: results, query: q, count: results.length });
});

module.exports = router;
