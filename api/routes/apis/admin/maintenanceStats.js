const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection')
const isAdmin = require('../../../middlewares/isAdmin')

router.get('/api/maintenance/dashboard', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        
        const [currentSession] = await connection.query(`
            SELECT * FROM maintenance_progress 
            ORDER BY start_time DESC LIMIT 1
        `);

        
        const [todayStats] = await connection.query(`
            SELECT 
                COALESCE(SUM(apps_processed), 0) as appsProcessed,
                COALESCE(SUM(apps_deleted), 0) as appsDeleted,
                COALESCE(SUM(coins_deducted), 0) as coinsDeducted
            FROM maintenance_progress
            WHERE DATE(start_time) = CURRENT_DATE
        `);

        
        const [yesterdayStats] = await connection.query(`
            SELECT 
                COALESCE(SUM(apps_processed), 0) as appsProcessed,
                COALESCE(SUM(apps_deleted), 0) as appsDeleted,
                COALESCE(SUM(coins_deducted), 0) as coinsDeducted
            FROM maintenance_progress
            WHERE DATE(start_time) = DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)
        `);

        
        const [historyStats] = await connection.query(`
            SELECT 
                DATE(start_time) as date,
                SUM(apps_processed) as appsProcessed,
                SUM(apps_deleted) as appsDeleted,
                SUM(coins_deducted) as coinsDeducted
            FROM maintenance_progress
            WHERE start_time >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
            GROUP BY DATE(start_time)
            ORDER BY date ASC
        `);

        
        const [recentSessions] = await connection.query(`
            SELECT * FROM maintenance_progress
            ORDER BY start_time DESC
            LIMIT 10
        `);

        
        const [recentLogs] = await connection.query(`
            SELECT * FROM maintenance_logs
            ORDER BY created_at DESC
            LIMIT 50
        `);

        const history = {
            dates: historyStats.map(stat => stat.date),
            appsProcessed: historyStats.map(stat => stat.appsProcessed),
            appsDeleted: historyStats.map(stat => stat.appsDeleted),
            coinsDeducted: historyStats.map(stat => stat.coinsDeducted)
        };

        res.json({
            currentStatus: currentSession[0]?.status || 'No Recent Sessions',
            lastRun: currentSession[0]?.start_time,
            today: todayStats[0],
            yesterday: yesterdayStats[0],
            history,
            recentSessions,
            recentLogs
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    } finally {
        connection.release();
    }
});

module.exports = router;