# YouTube Video Fetcher API

A Node.js application that fetches the latest videos from YouTube for a predefined search query and provides a paginated API to access them.

## Features Implemented

### Basic Requirements 
- [x] Background video fetching every 10 seconds
- [x] Store video data in MongoDB with proper indexes
- [x] Paginated GET API for videos (sorted by publish date)
- [x] Search API for videos by title and description
- [x] Docker containerization
- [x] Scalable and optimized architecture

### Bonus Features ✅
- [x] Multiple API key support with automatic rotation
- [x] Statistics and monitoring endpoints
- [x] Docker Compose for easy deployment
  

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **API**: YouTube Data API v3
- **Containerization**: Docker, Docker Compose
- **Background Jobs**: node-cron or setInterval

## Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd youtube-video-fetcher
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env and add your YouTube API key(s)
```

3. **Run with Docker Compose**
```bash
docker-compose up --build
```

4. **Access the API**
- Health check: http://localhost:3000/health
- Videos API: http://localhost:3000/api/videos
- Search API: http://localhost:3000/api/search?q=music

### Local Development

1. **Install dependencies**
```bash
npm install
```

2. **Set up MongoDB**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install MongoDB locally
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start the server**
```bash
npm run dev
```

## API Endpoints

### Videos

#### Get Videos (Paginated)
```
GET /api/videos?page=1&limit=10
```
### Search

#### Search Videos
```
GET /api/search?q=music&page=1&limit=10
```

**Features:**
- Searches in video title, description, and channel name
- Supports partial matching
- Paginated results
- 
### Statistics

#### Get Statistics
```
GET /api/videos/stats
```

## Configuration

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/youtube_videos

# YouTube API
YOUTUBE_API_KEYS=api_key_1,api_key_2,api_key_3
SEARCH_QUERY=official
FETCH_INTERVAL_SECONDS=10

# Pagination
DEFAULT_PAGE_SIZE=10
MAX_PAGE_SIZE=50
```

### YouTube API Setup

Refer- https://developers.google.com/youtube/v3/getting-started

## Docker Commands

```bash
# Build and start services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Development

### Project Structure
```
src/
├── controllers/     # API controllers
├── models/         # MongoDB models
├── routes/         # Express routes
├── services/       # Business logic services
├── jobs/           # Background job definitions
├── middleware/     # Express middleware
└── config/          # Utility functions
```

### Scripts
```bash
npm run dev        # Start development server with nodemon
```

## Testing the API

### Using curl
```bash
# Get health status
curl http://localhost:3000/health

# Get videos
curl "http://localhost:3000/api/videos?page=1&limit=5"

# Search videos
curl "http://localhost:3000/api/search?q=music&limit=3"

# Get statistics
curl http://localhost:3000/api/videos/stats
```

### Using Postman
Import the following endpoints:
- GET http://localhost:3000/api/videos
- GET http://localhost:3000/api/search?q=YOUR_QUERY
- GET http://localhost:3000/health

### Dashboard
Visit http://localhost:3000/dashboard for dashboard with important endpoints

## Performance Optimizations

- MongoDB indexes for efficient querying
- Connection pooling for database connections
- Bulk insert operations for video data
- Background job optimization to prevent overlapping executions

## Error Handling

- Comprehensive error handling for API failures
- Graceful handling of YouTube API quota limits
- Database connection error handling
- Input validation and sanitization

## Monitoring

- Health check endpoint for service monitoring
- Statistics endpoint for database insights
