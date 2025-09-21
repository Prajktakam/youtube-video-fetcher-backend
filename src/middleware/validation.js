const validatePagination = (req, res, next) => {
    const { page, limit } = req.query;

    if (page && (isNaN(page) || parseInt(page) < 1)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid page parameter',
            message: 'Page must be a positive integer'
        });
    }

    if (limit && (isNaN(limit) || parseInt(limit) < 1)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid limit parameter',
            message: 'Limit must be a positive integer'
        });
    }

    next();
};

const validateSearch = (req, res, next) => {
    const { q } = req.query;

    if (q && typeof q !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Invalid search query',
            message: 'Search query must be a string'
        });
    }

    if (q && q.length > 200) {
        return res.status(400).json({
            success: false,
            error: 'Search query too long',
            message: 'Search query must be less than 200 characters'
        });
    }

    next();
};

module.exports = {
    validatePagination,
    validateSearch
};