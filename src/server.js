require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');


const app = express();
const PORT = process.env.PORT || 3000;

const VideoFetchJob = require('./jobs/videoFetchJob');
const VideoFetcher = require('./services/videoFetcher');

const Video = require('./models/Video');

let videoFetcherInstance = null;

// middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes

// utility routes
// app health check route
app.get('/health', async (req, res) => {
    try {
        const videoCount = await Video.countDocuments();
        const latestVideo = await Video.findOne().sort({ publishedAt: -1 }).select('title publishedAt');

        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            database: {
                totalVideos: videoCount,
                latestVideo: latestVideo ? {
                    title: latestVideo.title,
                    publishedAt: latestVideo.publishedAt
                } : null
            }
        });
    } catch (error) {
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            database: { error: 'Could not fetch database stats' }
        });
    }
});

app.get('/stats', async (req, res) => {
    try {
        if (videoFetcherInstance) {
            const stats = await videoFetcherInstance.getStats();
            res.json(stats);
        } else {
            res.json({ error: 'Video fetcher not initialized' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// routes 
app.use('/api/videos', require('./routes/videos'));
app.use('/api/search', require('./routes/search'));

// Simple dashboard endpoint (bonus feature)
app.get('/dashboard', async (req, res) => {
    try {
        const stats = await Video.countDocuments();
        const latest = await Video.findOne().sort({ publishedAt: -1 }).select('title publishedAt');

        res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>YouTube Video Fetcher Dashboard</title></head>
      <body style="font-family: Arial, sans-serif; margin: 40px;">
        <h1>YouTube Video Fetcher Dashboard</h1>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Statistics</h3>
          <p><strong>Total Videos:</strong> ${stats}</p>
          <p><strong>Latest Video:</strong> ${latest ? latest.title : 'None'}</p>
          <p><strong>Last Updated:</strong> ${latest ? latest.publishedAt : 'Never'}</p>
        </div>
        <div style="background: #e8f4fd; padding: 20px; border-radius: 8px;">
          <h3>API Endpoints</h3>
          <p><a href="/api/videos" target="_blank">View All Videos</a></p>
          <p><a href="/api/search?q=music" target="_blank">Search Example (music)</a></p>
          <p><a href="/api/videos/stats" target="_blank">Statistics</a></p>
          <p><a href="/health" target="_blank">Health Check</a></p>
        </div>
        <p style="margin-top: 30px; color: #666;">
          Search Query: <strong>${process.env.SEARCH_QUERY}</strong> | 
          Fetch Interval: <strong>${process.env.FETCH_INTERVAL_SECONDS}s</strong>
        </p>
      </body>
      </html>
    `);
    } catch (error) {
        res.status(500).send('Dashboard unavailable');
    }
});

// error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// mongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('connected to MongoDB');

        // start background job after successful DB connection
        startBackgroundJob();

    } catch (error) {
        console.error('mongoDB connection error:', error.message);
        process.exit(1);
    }
};

// start background video fetching job
const startBackgroundJob = () => {
    try {
        videoFetcherInstance = new VideoFetcher();
        const videoFetchJob = new VideoFetchJob();
        videoFetchJob.start();
        console.log('Background video fetch job started');
    } catch (error) {
        console.error('Failed to start background job:', error.message);
    }
};

process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});

// start server
const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
        console.log(`Video stats check: http://localhost:${PORT}/stats`);
    });
};

startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
