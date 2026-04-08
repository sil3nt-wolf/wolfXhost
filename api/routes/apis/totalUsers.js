const express = require('express');
const router = express.Router();
const pool = require('../../database/sqlConnection')

router.get('/users/count',  async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
        const totalUsers = rows[0].totalUsers; 
        res.json({ totalUsers });
    } catch (error) {
        
        res.status(500).json({ error: 'An error occurred while counting users' });
    }
});
module.exports = router;