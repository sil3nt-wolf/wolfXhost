const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const isLoggedIn = require('../../../middlewares/isLoggedin');


router.get('/my-heroku', isLoggedIn, async (req, res) => {
    const userId = req.session.user.id;
    let connection;

    try {
        connection = await pool.getConnection();

        const [accounts] = await connection.query(
            `SELECT ha.email, ha.password, ha.recovery_codes, pha.purchased_at 
            FROM purchased_heroku_accounts pha 
            JOIN heroku_accounts ha ON pha.account_id = ha.id 
            WHERE pha.user_id = ?`,
            [userId]
        );

        res.json(accounts);
    } catch (error) {
        console.error('Error fetching purchased accounts:', error);
        res.status(500).json({ error: 'An error occurred while fetching your accounts' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;