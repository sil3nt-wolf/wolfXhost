const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection')
const isLoggedIn  = require('../../../middlewares/isLoggedin');


router.get('/user-coins', isLoggedIn, async (req, res) => {
    try {
        
        const [rows] = await pool.query('SELECT coins FROM users WHERE email = ?', [req.session.user.email]);

        if (rows.length > 0) {
            res.json({ coins: rows[0].coins });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user coins:', error);
        res.status(500).json({ error: 'An error occurred while fetching user coins' });
    }
});

module.exports = router;
