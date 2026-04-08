const express = require('express')
const router = express.Router();
const pool = require('../../../database/sqlConnection')
const isLoggedIn = require('../../../middlewares/isLoggedin')


router.post('/api/appeals/submit', isLoggedIn, async (req, res) => {
    try {
        const { reason, additionalInfo } = req.body;
        const userId = req.session.user.id; 

        
        const [existingAppeals] = await pool.query(
            'SELECT * FROM user_appeals WHERE user_id = ? AND status = "pending"',
            [userId]
        );

        if (existingAppeals.length > 0) {
            return res.status(400).json({
                message: 'You already have a pending appeal'
            });
        }

        
        const [result] = await pool.query(
            'INSERT INTO user_appeals (user_id, reason, additional_info) VALUES (?, ?, ?)',
            [userId, reason, additionalInfo]
        );

        res.status(201).json({
            message: 'Appeal submitted successfully',
            appealId: result.insertId
        });
    } catch (error) {
        console.error('Appeal submission error:', error);
        res.status(500).json({ message: 'Failed to submit appeal' });
    }
});
module.exports = router;