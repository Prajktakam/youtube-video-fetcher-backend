const Video = require('../models/Video');
const YouTubeAPIService = require('./youtubeService');

class VideoFetcher {
    constructor() {
        this.youtubeService = new YouTubeAPIService();
        this.searchQuery = process.env.SEARCH_QUERY || 'official';
        this.isRunning = false;
    }

    async fetchAndStoreVideos() {
        if (this.isRunning) {
            console.log('Fetch operation already in progress, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            console.log(`Starting video fetch for query: "${this.searchQuery}"`);

            // Get the latest video's published date from database
            const latestVideo = await Video.findOne()
                .sort({ publishedAt: -1 })
                .select('publishedAt');

            // If no videos exist, fetch from 1 hour ago
            // If videos exist, fetch from 2 minutes before the latest to handle overlaps
            let publishedAfter;
            if (latestVideo) {
                // Subtract 2 minutes from latest video to handle overlaps and precision issues
                publishedAfter = new Date(latestVideo.publishedAt.getTime() - 2 * 60 * 1000);
            } else {
                // First time - fetch from 1 hour ago
                publishedAfter = new Date(Date.now() - 60 * 60 * 1000);
            }

            console.log(`Fetching videos published after: ${publishedAfter.toISOString()}`);

            // Search for videos
            const searchResponse = await this.youtubeService.searchVideos(
                this.searchQuery,
                publishedAfter
            );

            if (!searchResponse.items || searchResponse.items.length === 0) {
                console.log('No new videos found');
                return;
            }

            console.log(`Found ${searchResponse.items.length} videos from search`);

            // Check which videos already exist in database
            const videoIds = searchResponse.items.map(item => item.id.videoId);
            const existingVideoIds = await Video.find({
                videoId: { $in: videoIds }
            }).distinct('videoId');

            // Filter out videos that already exist
            const newVideoIds = videoIds.filter(id => !existingVideoIds.includes(id));

            if (newVideoIds.length === 0) {
                console.log('No new videos to process (all already exist in database)');
                return;
            }

            console.log(`Processing ${newVideoIds.length} new videos (filtered ${existingVideoIds.length} duplicates)`);

            // Get detailed video information for new videos only
            const videoDetailsResponse = await this.youtubeService.getVideoDetails(newVideoIds);

            // Prepare video data for database
            const videosToSave = [];

            for (const searchItem of searchResponse.items) {
                // Skip videos that already exist
                if (existingVideoIds.includes(searchItem.id.videoId)) {
                    continue;
                }

                const videoDetail = videoDetailsResponse.items.find(
                    detail => detail.id === searchItem.id.videoId
                );

                if (!videoDetail) {
                    console.log(`No details found for video: ${searchItem.id.videoId}`);
                    continue;
                }

                const videoData = {
                    videoId: searchItem.id.videoId,
                    title: searchItem.snippet.title,
                    description: searchItem.snippet.description,
                    publishedAt: new Date(searchItem.snippet.publishedAt),
                    thumbnails: {
                        default: searchItem.snippet.thumbnails?.default,
                        medium: searchItem.snippet.thumbnails?.medium,
                        high: searchItem.snippet.thumbnails?.high
                    },
                    channelId: searchItem.snippet.channelId,
                    channelTitle: searchItem.snippet.channelTitle,
                    duration: videoDetail.contentDetails?.duration || '',
                    viewCount: parseInt(videoDetail.statistics?.viewCount || 0),
                    likeCount: parseInt(videoDetail.statistics?.likeCount || 0),
                    tags: videoDetail.snippet?.tags || []
                };

                videosToSave.push(videoData);
            }

            // Save new videos
            if (videosToSave.length > 0) {
                try {
                    const savedVideos = await Video.insertMany(videosToSave);
                    console.log(`Successfully saved ${savedVideos.length} new videos`);

                    // Log some details about the newest video
                    const newestVideo = videosToSave.reduce((latest, current) =>
                        current.publishedAt > latest.publishedAt ? current : latest
                    );
                    //console.log(`Latest video: "${newestVideo.title}" (${newestVideo.publishedAt.toISOString()})`);

                } catch (error) {
                    // Handle any remaining duplicate key errors gracefully
                    if (error.code === 11000) {
                        console.log('Some videos were already saved');
                    } else {
                        throw error;
                    }
                }
            } else {
                console.log('No new videos to save after filtering');
            }

            const executionTime = Date.now() - startTime;
            console.log(`Video fetch completed in ${executionTime}ms\n`);

        } catch (error) {
            console.error('Error fetching videos:', error.message);

            // Log more details for debugging
            if (error.response) {
                console.error('API Response Error:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data?.error?.message || error.response.data
                });
            }
        } finally {
            this.isRunning = false;
        }
    }

    // Method to get current stats
    async getStats() {
        try {
            const totalVideos = await Video.countDocuments();
            const latestVideo = await Video.findOne().sort({ publishedAt: -1 });
            const oldestVideo = await Video.findOne().sort({ publishedAt: 1 });

            return {
                totalVideos,
                latestVideoDate: latestVideo?.publishedAt,
                oldestVideoDate: oldestVideo?.publishedAt,
                searchQuery: this.searchQuery
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return null;
        }
    }
}

module.exports = VideoFetcher;