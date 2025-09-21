const axios = require('axios');

class YouTubeAPIService {
  constructor() {
    this.apiKeys = process.env.YOUTUBE_API_KEYS 
      ? process.env.YOUTUBE_API_KEYS.split(',').map(key => key.trim())
      : [];
    this.currentKeyIndex = 0;
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
    
    if (this.apiKeys.length === 0) {
      throw new Error('No YouTube API keys provided in environment variables');
    }
    
    console.log(`Initialized YouTube service with ${this.apiKeys.length} API key(s)`);
  }

  getCurrentApiKey() {
    return this.apiKeys[this.currentKeyIndex];
  }

  rotateApiKey() {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    console.log(`Rotated to API key index: ${this.currentKeyIndex}`);
  }

  async makeRequest(endpoint, params, retryCount = 0) {
    const maxRetries = this.apiKeys.length;
    
    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        params: {
          ...params,
          key: this.getCurrentApiKey()
        },
        timeout: 10000  // 10 second timeout
      });

      return response.data;
    } catch (error) {
      console.error(`YouTube API Error: ${error.response?.status} - ${error.response?.data?.error?.message}`);
      
      // Check if it's a quota exceeded error
      if (error.response?.status === 403 && 
          error.response?.data?.error?.errors?.[0]?.reason === 'quotaExceeded') {
        
        if (retryCount < maxRetries - 1) {
          console.log('Quota exceeded, rotating API key...');
          this.rotateApiKey();
          return this.makeRequest(endpoint, params, retryCount + 1);
        } else {
          throw new Error('All API keys have exceeded their quota');
        }
      }
      
      // For other errors, don't retry
      throw error;
    }
  }

  async searchVideos(query, publishedAfter, maxResults = 50) {
    const params = {
      part: 'snippet',
      type: 'video',
      q: query,
      order: 'date',
      maxResults,
      publishedAfter: publishedAfter.toISOString()
    };

    return this.makeRequest('/search', params);
  }

  async getVideoDetails(videoIds) {
    if (videoIds.length === 0) return { items: [] };
    
    const params = {
      part: 'snippet,contentDetails,statistics',
      id: videoIds.join(',')
    };

    return this.makeRequest('/videos', params);
  }
}

module.exports = YouTubeAPIService;