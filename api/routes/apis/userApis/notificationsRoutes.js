const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const isLoggedIn = require('../../../middlewares/isLoggedin');


router.get('/api/notifications', isLoggedIn, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.session.user.id;
        
        const [notifications] = await connection.query(`
            SELECT n.*
            FROM notifications n
            LEFT JOIN notification_targets nt ON n.id = nt.notification_id
            LEFT JOIN notification_recipients nr ON n.id = nr.notification_id
            WHERE 
                (nt.target_type = 'all' OR nr.user_id = ?)
                AND (n.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))
            ORDER BY n.created_at DESC
            LIMIT 10
        `, [userId]);
        
        const [unreadCount] = await connection.query(`
            SELECT COUNT(*) as count
            FROM notifications n
            LEFT JOIN notification_targets nt ON n.id = nt.notification_id
            LEFT JOIN notification_recipients nr ON n.id = nr.notification_id
            WHERE 
                (nt.target_type = 'all' OR nr.user_id = ?)
                AND n.read = FALSE
        `, [userId]);
        
        res.json({
            notifications,
            unreadCount: unreadCount[0].count
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    } finally {
        connection.release();
    }
});


router.post('/api/notifications/:id/read', isLoggedIn, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.session.user.id;
        const notificationId = req.params.id;

        await connection.query(`
            UPDATE notifications n
            LEFT JOIN notification_targets nt ON n.id = nt.notification_id
            LEFT JOIN notification_recipients nr ON n.id = nr.notification_id
            SET n.read = TRUE
            WHERE n.id = ?
            AND (
                nt.target_type = 'all'
                OR nr.user_id = ?
            )
        `, [notificationId, userId]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    } finally {
        connection.release();
    }
});


router.post('/api/notifications/mark-all-read', isLoggedIn, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.session.user.id;

        await connection.query(`
            UPDATE notifications 
            SET \`read\` = TRUE  -- Enclose 'read' in backticks
            WHERE id IN (
                SELECT notification_id 
                FROM (
                    SELECT DISTINCT n.id as notification_id
                    FROM notifications n
                    LEFT JOIN notification_targets nt ON n.id = nt.notification_id
                    LEFT JOIN notification_recipients nr ON n.id = nr.notification_id
                    WHERE nt.target_type = 'all' OR nr.user_id = ?
                ) as subquery
            )
        `, [userId]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    } finally {
        connection.release();
    }
});


router.post('/api/notifications/mark-seen', isLoggedIn, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.session.user.id;

        await connection.query(`
            UPDATE notifications 
            SET seen = TRUE 
            WHERE id IN (
                SELECT notification_id 
                FROM (
                    SELECT DISTINCT n.id as notification_id
                    FROM notifications n
                    LEFT JOIN notification_targets nt ON n.id = nt.notification_id
                    LEFT JOIN notification_recipients nr ON n.id = nr.notification_id
                    WHERE nt.target_type = 'all' OR nr.user_id = ?
                ) as subquery
            )
        `, [userId]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notifications as seen:', error);
        res.status(500).json({ error: 'Failed to mark notifications as seen' });
    } finally {
        connection.release();
    }
});

module.exports = router;