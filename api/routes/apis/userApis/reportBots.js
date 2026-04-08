const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection')
const isLoggedIn  = require('../../../middlewares/isLoggedin');


router.post('/api/report-bot', isLoggedIn, async (req, res) => {
    try {
    const { botId, reportType, description } = req.body;
    const userId = req.session.user.id;
    
    
    if (!botId || botId.trim() === '') {
        return res.status(400).json({ error: 'Bot ID is required.' });
    }
    
    // Check if bot exists
    const [botExists] = await pool.query('SELECT id FROM bots WHERE id = ?', [botId]);
    if (botExists.length === 0) {
        return res.status(404).json({ error: 'Bot not found.' });
    }
    
    // Check if user has reported this bot recently
    const [existingReports] = await pool.query(
        'SELECT * FROM bot_reports WHERE bot_id = ? AND user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)',
        [botId, userId]
    );
    
    if (existingReports.length > 0) {
        return res.status(429).json({ 
            error: 'You have already reported this bot recently. Please wait 24 hours before submitting another report.' 
        });
    }
    
    // Insert the report
    await pool.query(
        'INSERT INTO bot_reports (bot_id, user_id, report_type, description) VALUES (?, ?, ?, ?)',
        [botId, userId, reportType, description]
    );
    
    res.json({ message: 'Report submitted successfully' });
    } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
    }
    });
    module.exports = router;