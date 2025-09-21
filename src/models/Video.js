const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    videoId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    publishedAt: {
        type: Date,
        required: true,
        index: -1  // descending index for sorting
    },
    thumbnails: {
        default: {
            url: String,
            width: Number,
            height: Number
        },
        medium: {
            url: String,
            width: Number,
            height: Number
        },
        high: {
            url: String,
            width: Number,
            height: Number
        }
    },
    channelId: {
        type: String,
        required: true
    },
    channelTitle: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        default: ''
    },
    viewCount: {
        type: Number,
        default: 0
    },
    likeCount: {
        type: Number,
        default: 0
    },
    tags: [{
        type: String
    }]
}, {
    timestamps: true
});

// text index for search functionality
videoSchema.index({
    title: 'text',
    description: 'text',
    channelTitle: 'text'
}, {
    weights: {
        title: 10,
        channelTitle: 5,
        description: 1
    }
});

// compound index for efficient pagination
videoSchema.index({ publishedAt: -1, _id: 1 });

// transform JSON output: removes Mongo internals and timestamps from API responses

videoSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id;   // copy _id into id
        delete ret._id;     // remove _id
        delete ret.__v;
        delete ret.createdAt;
        delete ret.updatedAt;
        return ret;
    }
});

module.exports = mongoose.model('Video', videoSchema);