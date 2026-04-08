const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection')


router.get('/share-bot/:botId',  async (req, res) => {
    try {
    
    const [botRows] = await pool.query(
        'SELECT * FROM bots WHERE id = ?',
        [req.params.botId]
    );
    
    if (botRows.length === 0) {
        return res.status(404).send('Bot not found');
    }
    
    
    res.redirect(
        `/dashboard/select-bot/prepare-deployment?botId=${encodeURIComponent(req.params.botId)}`
    );
    } catch (error) {
    console.error('Error handling shared link:', error);
    res.status(500).send('An error occurred');
    }
    });

    module.exports = router;