const Video = require('../models/Video');

class VideoController {
    // GET /api/videos - Paginated videos in descending order of published date
    async getVideos(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(
                parseInt(req.query.limit) || parseInt(process.env.DEFAULT_PAGE_SIZE) || 10,
                parseInt(process.env.MAX_PAGE_SIZE) || 50
            );
            const skip = (page - 1) * limit;

            // Get total count for pagination metadata
            const totalVideos = await Video.countDocuments();
            const totalPages = Math.ceil(totalVideos / limit);

            // Fetch videos with pagination, sorted by publishedAt in descending order
            const videos = await Video.find()
                .select('-__v') // Exclude version field
                .sort({ publishedAt: -1, _id: -1 }) // Secondary sort by _id for consistency
                .skip(skip)
                .limit(limit)
                .lean(); // Use lean() for better performance

            // Prepare pagination metadata
            const pagination = {
                currentPage: page,
                totalPages,
                totalVideos,
                videosPerPage: limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
                nextPage: page < totalPages ? page + 1 : null,
                previousPage: page > 1 ? page - 1 : null
            };

            res.json({
                success: true,
                data: videos,
                pagination
            });

        } catch (error) {
            console.error('Error fetching videos:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch videos',
                message: error.message
            });
        }
    }

    // GET /api/videos/stats - Get database statistics
    async getStats(req, res) {
        try {
            const totalVideos = await Video.countDocuments();
            const latestVideo = await Video.findOne()
                .sort({ publishedAt: -1 })
                .select('title publishedAt channelTitle');

            const oldestVideo = await Video.findOne()
                .sort({ publishedAt: 1 })
                .select('title publishedAt channelTitle');

            // Get channel statistics
            const channelStats = await Video.aggregate([
                {
                    $group: {
                        _id: '$channelTitle',
                        videoCount: { $sum: 1 },
                        latestVideo: { $max: '$publishedAt' }
                    }
                },
                {
                    $sort: { videoCount: -1 }
                },
                {
                    $limit: 10
                }
            ]);

            res.json({
                success: true,
                data: {
                    totalVideos,
                    latestVideo,
                    oldestVideo,
                    topChannels: channelStats,
                    searchQuery: process.env.SEARCH_QUERY || 'official'
                }
            });

        } catch (error) {
            console.error('Error fetching stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch statistics',
                message: error.message
            });
        }
    }
}

module.exports = new VideoController();