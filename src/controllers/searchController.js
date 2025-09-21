const Video = require('../models/Video');

class SearchController {
    // GET /api/search - Search videos by title and description
    async searchVideos(req, res) {
        try {
            const { q: query, page = 1, limit: requestLimit = 10 } = req.query;

            // Validate search query
            if (!query || query.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Search query is required',
                    message: 'Please provide a search query using the "q" parameter'
                });
            }

            // Sanitize and prepare search query
            const searchQuery = query.trim();
            const pageNum = Math.max(1, parseInt(page));
            const limit = Math.min(
                parseInt(requestLimit),
                parseInt(process.env.MAX_PAGE_SIZE) || 50
            );
            const skip = (pageNum - 1) * limit;

            // Create search filter
            // First try exact text search, then fallback to regex for partial matching
            let searchFilter;

            // Method 1: MongoDB text search (faster, but requires exact word matches)
            const textSearchFilter = {
                $text: {
                    $search: searchQuery,
                    $caseSensitive: false
                }
            };

            // Method 2: Regex search for partial matching (slower, but more flexible)
            const regexSearchFilter = {
                $or: [
                    { title: { $regex: searchQuery, $options: 'i' } },
                    { description: { $regex: searchQuery, $options: 'i' } },
                    { channelTitle: { $regex: searchQuery, $options: 'i' } }
                ]
            };

            // Try text search first
            let totalVideos = await Video.countDocuments(textSearchFilter);
            let useTextSearch = totalVideos > 0;

            // If no results with text search, try regex search
            if (totalVideos === 0) {
                totalVideos = await Video.countDocuments(regexSearchFilter);
                useTextSearch = false;
            }

            // If still no results
            if (totalVideos === 0) {
                return res.json({
                    success: true,
                    data: [],
                    pagination: {
                        currentPage: pageNum,
                        totalPages: 0,
                        totalVideos: 0,
                        videosPerPage: limit,
                        hasNextPage: false,
                        hasPreviousPage: false,
                        nextPage: null,
                        previousPage: null
                    },
                    searchQuery: searchQuery,
                    searchMethod: 'none'
                });
            }

            // Fetch results
            searchFilter = useTextSearch ? textSearchFilter : regexSearchFilter;
            const query_builder = Video.find(searchFilter)
                .select('-__v')
                .skip(skip)
                .limit(limit)
                .lean();

            // Apply sorting
            if (useTextSearch) {
                // For text search, sort by relevance score then by date
                query_builder.select({ score: { $meta: 'textScore' } });
                query_builder.sort({
                    score: { $meta: 'textScore' },
                    publishedAt: -1
                });
            } else {
                // For regex search, sort by date only
                query_builder.sort({ publishedAt: -1, _id: -1 });
            }

            const videos = await query_builder;

            const totalPages = Math.ceil(totalVideos / limit);

            // Prepare pagination metadata
            const pagination = {
                currentPage: pageNum,
                totalPages,
                totalVideos,
                videosPerPage: limit,
                hasNextPage: pageNum < totalPages,
                hasPreviousPage: pageNum > 1,
                nextPage: pageNum < totalPages ? pageNum + 1 : null,
                previousPage: pageNum > 1 ? pageNum - 1 : null
            };

            res.json({
                success: true,
                data: videos,
                pagination,
                searchQuery: searchQuery,
                searchMethod: useTextSearch ? 'text-search' : 'regex-search'
            });

        } catch (error) {
            console.error('Error searching videos:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to search videos',
                message: error.message
            });
        }
    }

    // GET /api/search/suggestions - Get search suggestions based on existing video titles
    async getSearchSuggestions(req, res) {
        try {
            const { q: query } = req.query;

            if (!query || query.trim().length < 2) {
                return res.json({
                    success: true,
                    data: [],
                    message: 'Query too short for suggestions'
                });
            }

            const searchQuery = query.trim();

            // Get unique words from video titles that contain the search query
            const suggestions = await Video.aggregate([
                {
                    $match: {
                        title: { $regex: searchQuery, $options: 'i' }
                    }
                },
                {
                    $group: {
                        _id: '$title',
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { count: -1 }
                },
                {
                    $limit: 10
                },
                {
                    $project: {
                        title: '$_id',
                        count: 1,
                        _id: 0
                    }
                }
            ]);

            res.json({
                success: true,
                data: suggestions,
                searchQuery: searchQuery
            });

        } catch (error) {
            console.error('Error getting search suggestions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get search suggestions',
                message: error.message
            });
        }
    }
}

module.exports = new SearchController();
