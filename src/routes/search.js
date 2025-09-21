const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// GET /api/search - Search videos
router.get('/', searchController.searchVideos);

// GET /api/search/suggestions - Get search suggestions
router.get('/suggestions', searchController.getSearchSuggestions);

module.exports = router;