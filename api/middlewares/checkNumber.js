const express = require('express');
const router = express.Router();
const pool = require('../database/sqlConnection')
router.post('/check-username', async (req, res) => {
    const { username } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length > 0) {
            res.json({ success: true, message: 'Phone number exists.' });
        } else {
            res.json({ success: false, message: 'User not found. Proceeding with registration.' });
        }
    } catch (error) {
        console.error('Error checking phone number:', error);
        res.status(500).json({ success: false, message: 'An error occurred while checking the phone number.' });
    }
});