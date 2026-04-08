const express = require('express')
const router = express.Router();
const pool = require('../../../database/sqlConnection')
const isAdmin = require('../../../middlewares/isAdmin')

router.post('/api/admin/notifications', isAdmin, async (req, res) => {
    const { message, type, sendToAll, userIds, link } = req.body;

    
    console.log('Received request to create notification:', { message, type, sendToAll, userIds, link });

    
    if (!message) {
        console.error('Validation error: Message is required');
        return res.status(400).json({ error: 'Message is required' });
    }

    const processedLink = link && link.trim() !== '' ? link.trim() : null;

    // Validate link if provided
    if (processedLink && !isValidUrl(processedLink)) {
        console.error('Validation error: Invalid URL format', { link: processedLink });
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        console.log('Inserting notification into database:', {
            message,
            type: type || 'general',
            link: processedLink,
            target_type: sendToAll ? 'all' : 'specific',
        });

        
        const [notificationResult] = await connection.query(
            'INSERT INTO notifications (message, type, link, created_at, target_type) VALUES (?, ?, ?, NOW(), ?)', 
            [
                message,
                type || 'general',
                processedLink,
                sendToAll ? 'all' : 'specific',
            ]
        );

        const notificationId = notificationResult.insertId;

        
        console.log('Notification created with ID:', notificationId);

        
        if (sendToAll) {
            console.log('Assigning notification to all users');
            await connection.query(`
                INSERT INTO notification_recipients (notification_id, user_id, created_at)
                SELECT ?, id, NOW() FROM users
            `, [notificationId]);
        } else if (userIds && userIds.length > 0) {
            console.log('Assigning notification to specific users:', userIds);
            const userValues = userIds.map(userId => [notificationId, userId, new Date()]);
            await connection.query(`
                INSERT INTO notification_recipients (notification_id, user_id, created_at)
                VALUES ?
            `, [userValues]);
        }

        await connection.commit();
        console.log('Notification successfully committed to database');

        res.status(201).json({ 
            success: true, 
            notificationId, 
            message: 'Notification created successfully' 
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error creating notification:', error);
        res.status(500).json({ 
            error: 'Failed to create notification', 
            details: error.message 
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


router.delete('/api/admin/notifications/:id', isAdmin, async (req, res) => {
    const notificationId = req.params.id;
    console.log('Received request to delete notification with ID:', notificationId);

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        
        console.log('Deleting notification recipients for notification ID:', notificationId);
        await connection.query('DELETE FROM notification_recipients WHERE notification_id = ?', [notificationId]);

        console.log('Deleting notification targets for notification ID:', notificationId);
        await connection.query('DELETE FROM notification_targets WHERE notification_id = ?', [notificationId]);

        
        console.log('Deleting main notification record');
        const [result] = await connection.query('DELETE FROM notifications WHERE id = ?', [notificationId]);

        if (result.affectedRows === 0) {
            console.warn('Notification not found, rolling back transaction');
            await connection.rollback();
            return res.status(404).json({ error: 'Notification not found' });
        }

        await connection.commit();
        console.log('Notification deleted successfully');

        res.json({ 
            success: true, 
            message: 'Notification deleted successfully' 
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error deleting notification:', error);
        res.status(500).json({ 
            error: 'Failed to delete notification', 
            details: error.message 
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


router.get('/api/admin/notifications/stats', isAdmin, async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_notifications,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as last_24h,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as last_7d,
                ROUND(AVG(
                    CASE 
                        WHEN target_type = 'all' 
                        THEN (SELECT COUNT(*) FROM users)
                        ELSE (SELECT COUNT(*) FROM notification_recipients WHERE notification_id = notifications.id)
                    END
                ), 2) as avg_recipients
            FROM notifications
        `);
        
        res.json(stats[0]);
    } catch (error) {
        console.error('Error fetching notification stats:', error);
        res.status(500).json({ 
            error: 'Failed to fetch notification stats', 
            details: error.message 
        });
    }
});


router.get('/api/admin/notifications', isAdmin, async (req, res) => {
    try {
        const [notifications] = await pool.query(`
            SELECT 
                n.id, 
                n.message, 
                n.type,
                n.link,
                n.created_at, 
                n.target_type,
                (SELECT COUNT(*) FROM notification_recipients WHERE notification_id = n.id) as recipient_count,
                (SELECT COUNT(*) FROM notification_recipients WHERE notification_id = n.id AND is_read = 1) as read_count
            FROM notifications n
            ORDER BY n.created_at DESC
            LIMIT 50
        `);
        
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ 
            error: 'Failed to fetch notifications', 
            details: error.message 
        });
    }
});


function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
}

module.exports = router;