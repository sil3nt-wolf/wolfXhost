const express = require('express');
const router = express.Router();
const pool = require('../../../../database/sqlConnection')
const isLoggedIn  = require('../../../../middlewares/isLoggedin');

router.get('/user-apps', isLoggedIn, async (req, res) => {
    try {
        const email = req.session.user.email; 
        const [userRows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const [appRows] = await pool.query(`
            SELECT 
                SUBSTRING_INDEX(app_name, '-td', 1) as display_name,
                app_name as heroku_name,
                deployed_at,
                status,
                error_message
            FROM deployed_apps 
            WHERE user_id = ?
            ORDER BY deployed_at DESC
        `, [userRows[0].id]);

        res.json(appRows);
    } catch (error) {
        console.error('Error fetching user apps:', error);
        res.status(500).json({ error: 'An error occurred while fetching user apps' });
    }
});

module.exports = router;