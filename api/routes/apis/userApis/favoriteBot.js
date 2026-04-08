const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const isLoggedIn = require('../../../middlewares/isLoggedin');


router.post('/api/favorite-bot', isLoggedIn, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { botId } = req.body;
        const userId = req.session.user.id;

        
        if (!botId || !userId) {
            await conn.rollback();
            return res.status(400).json({ 
                error: 'Missing required parameters' 
            });
        }

        
        const [botExists] = await conn.query(
            'SELECT id FROM bots WHERE id = ?', 
            [botId]
        );

        if (botExists.length === 0) {
            await conn.rollback();
            return res.status(404).json({ 
                error: 'Bot not found' 
            });
        }

        
        const [existing] = await conn.query(
            'SELECT id FROM favorite_bots WHERE user_id = ? AND bot_id = ?',
            [userId, botId]
        );

        if (existing.length > 0) {
            
            await conn.query(
                'DELETE FROM favorite_bots WHERE user_id = ? AND bot_id = ?',
                [userId, botId]
            );
            await conn.commit();
            res.json({ isFavorite: false });
        } else {
            
            await conn.query(
                'INSERT INTO favorite_bots (user_id, bot_id) VALUES (?, ?)',
                [userId, botId]
            );
            await conn.commit();
            res.json({ isFavorite: true });
        }
    } catch (error) {
        await conn.rollback();
        console.error('Error toggling favorite:', error);
        res.status(500).json({ 
            error: 'Failed to toggle favorite',
            details: error.message});
    } finally {
        conn.release();
    }
});

module.exports = router;