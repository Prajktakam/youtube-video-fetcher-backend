const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');

// GET /api/videos - Get paginated videos
router.get('/', videoController.getVideos);

// GET /api/videos/stats - Get statistics
router.get('/stats', videoController.getStats);

module.exports = router;