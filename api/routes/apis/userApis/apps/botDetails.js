const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../../../../database/sqlConnection');
const isLoggedIn = require('../../../../middlewares/isLoggedin');


router.get('/dashboard/bot-details/:appName', isLoggedIn, async (req, res) => {
    let connection;
    try {
        const appName = req.params.appName;
        const userEmail = req.session.user.email;

        connection = await pool.getConnection();

        
        const [app] = await connection.execute(`
            SELECT 
                SUBSTRING_INDEX(d.app_name, '-td', 1) as display_name,
                d.app_name as heroku_name,
                d.deployed_at,
                d.status,
                d.error_message
            FROM deployed_apps d
            JOIN users u ON d.user_id = u.id
            WHERE SUBSTRING_INDEX(d.app_name, '-td', 1) = ?
            AND u.email = ?
        `, [appName, userEmail]);

        if (app.length === 0) {
            return res.status(403).render('error', { 
                message: 'Access denied: You do not have permission to view this app or it does not exist'
            });
        }

        res.render('botDetails', { app: app[0] });
    } catch (error) {
        console.error('Error in botDetails route:', error);
        res.status(500).render('error', { 
            message: 'An error occurred while fetching bot details'
        });
    } finally {
        if (connection) {
            try {
                connection.release();
            } catch (releaseError) {
                console.error('Error releasing connection:', releaseError);
            }
        }
    }
});

module.exports = router;