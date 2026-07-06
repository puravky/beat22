const express = require('express');
const beatStore = require('../services/beatStore');
const interactionService = require('../services/interactionService');
const recommendationService = require('../services/recommendationService');

const router = express.Router();

// GET /api/beats - fetch all beats
router.get('/', (req, res) => {
  res.json({ data: beatStore.getAll() });
});

// GET /api/beats/meta - list distinct genres/moods (useful for filter UI)
router.get('/meta', (req, res) => {
  res.json({
    genres: beatStore.getAllGenres(),
    moods: beatStore.getAllMoods(),
  });
});

// GET /api/beats/:id - fetch a single beat's full details
router.get('/:id', (req, res) => {
  const beat = beatStore.getById(req.params.id);
  if (!beat) {
    return res.status(404).json({ error: 'Beat not found' });
  }

  // Record the view for the recommendation engine, if a user id was sent.
  const userId = req.header('x-user-id');
  if (userId) {
    interactionService.recordView(userId, beat.id);
  }

  res.json({ data: beat });
});

// GET /api/beats/:id/similar - embedding-based "more like this"
router.get('/:id/similar', (req, res) => {
  const beat = beatStore.getById(req.params.id);
  if (!beat) {
    return res.status(404).json({ error: 'Beat not found' });
  }
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
  const data = recommendationService.similarBeats(beat.id, limit);
  res.json({ data, count: data.length });
});

module.exports = router;
