const express = require('express');
const router = express.Router();
const pool = require('../../database/sqlConnection')

router.get('/api/server-stats', async (req, res) => {
    try {
        const connection = await pool.getConnection();

        try {
            
            const [serverStats] = await connection.query(`
                SELECT 
                    COUNT(*) as totalServers,
                    SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as activeServers,
                    SUM(apps_count) as totalApps,
                    AVG(CASE WHEN apps_count > 0 THEN (apps_count / 98) * 100 ELSE 0 END) as avgLoad
                FROM heroku_api_keys
            `);

            
            const [servers] = await connection.query(`
                SELECT 
                    id,
                    is_active as isActive,
                    apps_count as appsCount,
                    ROUND((apps_count / 98) * 100, 1) as \`load\`,
                    last_used as lastActive
                FROM heroku_api_keys
                ORDER BY is_active DESC, apps_count DESC
            `);

            
            const response = {
                totalServers: serverStats[0].totalServers,
                activeServers: serverStats[0].activeServers,
                totalApps: serverStats[0].totalApps,
                avgLoad: Math.round(serverStats[0].avgLoad),
                servers: servers.map(server => ({
                    ...server,
                    lastActive: formatTimeAgo(server.lastActive)
                }))
            };

            res.json(response);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error fetching server stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


function formatTimeAgo(date) {
    if (!date) return 'Never';

    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';

    return Math.floor(seconds) + ' seconds ago';
}

module.exports = router;