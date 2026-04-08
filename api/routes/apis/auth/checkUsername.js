
const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');


router.get('/check-username', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { username } = req.query;

        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username is required',
            });
        }

        
        const [existingUsernames] = await connection.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER(?)',
            [username]
        );

        if (existingUsernames.length > 0) {
            return res.json({
                success: true,
                isAvailable: false,
                message: 'Username is already taken',
            });
        }

        return res.json({
            success: true,
            isAvailable: true,
            message: 'Username is available',
        });
    } catch (error) {
        console.error('Error checking username availability:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while checking username availability',
        });
    } finally {
        connection.release();
    }
});

module.exports = router;