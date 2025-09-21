const cron = require('node-cron');
const VideoFetcher = require('../services/videoFetcher');

class VideoFetchJob {
    constructor() {
        this.videoFetcher = new VideoFetcher();
        this.isJobRunning = false;
    }

    start() {
        const intervalSeconds = parseInt(process.env.FETCH_INTERVAL_SECONDS) || 10;

        console.log(`Starting video fetch job every ${intervalSeconds} seconds`);

        // Create cron expression for the interval
        // For intervals less than 60 seconds, we'll use a different approach
        if (intervalSeconds < 60) {
            // Use setInterval for sub-minute intervals
            this.startIntervalJob(intervalSeconds);
        } else {
            // Use cron for minute-based intervals
            const cronExpression = `*/${Math.floor(intervalSeconds / 60)} * * * *`;
            this.startCronJob(cronExpression);
        }
    }

    startIntervalJob(seconds) {
        // Initial fetch
        this.executeJob();

        // Set up interval
        setInterval(() => {
            this.executeJob();
        }, seconds * 1000);
    }

    startCronJob(cronExpression) {
        cron.schedule(cronExpression, () => {
            this.executeJob();
        });
    }

    async executeJob() {
        if (this.isJobRunning) {
            console.log('Previous job still running, skipping this execution');
            return;
        }

        this.isJobRunning = true;

        try {
            await this.videoFetcher.fetchAndStoreVideos();
        } catch (error) {
            console.error('Background job error:', error);
        } finally {
            this.isJobRunning = false;
        }
    }
}

module.exports = VideoFetchJob;