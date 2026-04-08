const express = require('express');
const router = express.Router();
const pool = require('../database/sqlConnection');


async function queryDatabase(query, params = []) {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query(query, params);
        return rows;
    } catch (error) {
        throw error;
    } finally {
        connection.release();
    }
}


router.get('/dashboard/select-bot', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const showFavorites = req.query.favorites === 'true';
        
        
        const isLoggedIn = req.session && req.session.user;
        const userId = isLoggedIn ? req.session.user.id : null;
        
        let query = `
            SELECT 
                b.*,
                COALESCE(b.total_deployments, 0) as deployment_count,
                CASE
                    WHEN total_deployments >= 100 THEN 'popular'
                    WHEN total_deployments >= 50 THEN 'rising'
                    ELSE 'standard'
                END as popularity_tier
        `;
        
        
        if (isLoggedIn) {
            query += `,
                EXISTS(
                    SELECT 1 FROM favorite_bots 
                    WHERE bot_id = b.id AND user_id = ?
                ) as is_favorite
            `;
        } else {
            query += `, 
                FALSE as is_favorite
            `;
        }
        
        query += ` FROM bots b WHERE b.is_suspended = FALSE`;
        
        
        if (isLoggedIn && showFavorites) {
            query += ` AND EXISTS (SELECT 1 FROM favorite_bots fb WHERE fb.bot_id = b.id AND fb.user_id = ?)`;
        }
        
        query += ` ORDER BY total_deployments DESC, name ASC LIMIT ? OFFSET ?`;
        
        let queryParams = [];
        if (isLoggedIn) {
            queryParams = showFavorites ? [userId, userId, limit, offset] : [userId, limit, offset];
        } else {
            queryParams = [limit, offset];
        }
        
        const bots = await queryDatabase(query, queryParams);
        
        let countQuery = `SELECT COUNT(*) as total FROM bots b WHERE b.is_suspended = FALSE`;
        let countParams = [];
        
        if (isLoggedIn && showFavorites) {
            countQuery += ` AND EXISTS (SELECT 1 FROM favorite_bots fb WHERE fb.bot_id = b.id AND fb.user_id = ?)`;
            countParams = [userId];
        }
        
        const countResult = await queryDatabase(countQuery, countParams);
        
        const totalBots = countResult[0].total;
        const totalPages = Math.ceil(totalBots / limit);
        
        res.render('select-bot', { 
            bots,
            currentPage: page,
            totalPages,
            totalBots,
            userId,
            showFavorites,
            isLoggedIn
        });
    } catch (error) {
        console.error('Error fetching bots:', error);
        res.status(500).json({ error: 'An error occurred while fetching bots' });
    }
});


router.get('/api/search-bots', async (req, res) => {
    try {
        const searchTerm = req.query.term?.toLowerCase() || '';
        const showFavorites = req.query.favorites === 'true';

        
        const isLoggedIn = req.session && req.session.user;
        const userId = isLoggedIn ? req.session.user.id : null;

        let query = `
            SELECT 
                b.*,
                COALESCE(b.total_deployments, 0) as deployment_count,
                CASE
                    WHEN total_deployments >= 100 THEN 'popular'
                    WHEN total_deployments >= 50 THEN 'rising'
                    ELSE 'standard'
                END as popularity_tier
        `;
        
        
        if (isLoggedIn) {
            query += `,
                EXISTS(
                    SELECT 1 FROM favorite_bots 
                    WHERE bot_id = b.id AND user_id = ?
                ) as is_favorite
            `;
        } else {
            query += `, 
                FALSE as is_favorite
            `;
        }
        
        query += ` FROM bots b WHERE b.is_suspended = FALSE AND LOWER(b.name) LIKE ?`;

        
        if (isLoggedIn && showFavorites) {
            query += ` AND EXISTS (SELECT 1 FROM favorite_bots fb WHERE fb.bot_id = b.id AND fb.user_id = ?)`;
        }

        query += ` ORDER BY total_deployments DESC, name ASC`;
        
        let queryParams = [];
        if (isLoggedIn) {
            queryParams = showFavorites 
                ? [userId, `%${searchTerm}%`, userId]
                : [userId, `%${searchTerm}%`];
        } else {
            queryParams = [`%${searchTerm}%`];
        }

        const bots = await queryDatabase(query, queryParams);
        res.json(bots);
    } catch (error) {
        console.error('Error searching bots:', error);
        res.status(500).json({ error: 'Failed to search bots' });
    }
});


router.post('/api/favorite-bot', async (req, res) => {
    
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Please log in to add favorites' });
    }
    
    try {
        const { botId } = req.body;
        const userId = req.session.user.id;
        
        
        const checkQuery = `SELECT * FROM favorite_bots WHERE bot_id = ? AND user_id = ?`;
        const existing = await queryDatabase(checkQuery, [botId, userId]);
        
        let isFavorite;
        if (existing.length > 0) {
            
            await queryDatabase(`DELETE FROM favorite_bots WHERE bot_id = ? AND user_id = ?`, [botId, userId]);
            isFavorite = false;
        } else {
            
            await queryDatabase(`INSERT INTO favorite_bots (bot_id, user_id) VALUES (?, ?)`, [botId, userId]);
            isFavorite = true;
        }
        
        res.json({ success: true, isFavorite });
    } catch (error) {
        console.error('Error toggling favorite:', error);
        res.status(500).json({ error: 'Failed to update favorite status' });
    }
});


router.post('/api/report-bot', async (req, res) => {
    
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Please log in to report a bot' });
    }
    
    try {
        const { botId, reportType, description } = req.body;
        const userId = req.session.user.id;
        
        
        const checkQuery = `
            SELECT COUNT(*) as count FROM bot_reports 
            WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `;
        const reportCount = await queryDatabase(checkQuery, [userId]);
        
        if (reportCount[0].count > 0) {
            return res.status(429).json({ error: 'Please wait 24 hours before submitting another report' });
        }
        
        
        const insertQuery = `
            INSERT INTO bot_reports (bot_id, user_id, report_type, description)
            VALUES (?, ?, ?, ?)
        `;
        await queryDatabase(insertQuery, [botId, userId, reportType, description]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error reporting bot:', error);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

router.get('/api/bot-comments', async (req, res) => {
    try {
        const { botId } = req.query;
        const query = `
            SELECT c.*, u.username 
            FROM bot_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.bot_id = ?
            ORDER BY c.created_at DESC
        `;
        const comments = await queryDatabase(query, [botId]);
        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});


router.post('/api/bot-comments', async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Please log in to comment' });
    }

    try {
        const { botId, comment } = req.body;
        const userId = req.session.user.id;

        const insertQuery = `
            INSERT INTO bot_comments (bot_id, user_id, comment)
            VALUES (?, ?, ?)
        `;
        await queryDatabase(insertQuery, [botId, userId, comment]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error submitting comment:', error);
        res.status(500).json({ error: 'Failed to submit comment' });
    }
});
module.exports = router;