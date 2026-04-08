const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const isAdmin = require('../../../middlewares/isAdmin');
const { v4: uuidv4 } = require('uuid');


router.get('/api/admin/stats', isAdmin, async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_tickets,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tickets,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tickets,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_tickets,
                SUM(CASE WHEN priority = 'high' OR priority = 'urgent' THEN 1 ELSE 0 END) as high_priority_tickets
            FROM support_tickets
        `);

        
        const [avgResponse] = await pool.query(`
            SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_response_time
            FROM support_tickets
            WHERE status != 'open' AND updated_at IS NOT NULL
        `);

        res.json({
            ...stats[0],
            avg_response_time: avgResponse[0].avg_response_time || 0
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});


router.get('/api/admin/tickets', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        let whereConditions = ['1=1'];
        const queryParams = [];

        if (req.query.status) {
            whereConditions.push('status = ?');
            queryParams.push(req.query.status);
        }

        if (req.query.priority) {
            whereConditions.push('priority = ?');
            queryParams.push(req.query.priority);
        }

        
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM support_tickets WHERE ${whereConditions.join(' AND ')}`,
            queryParams
        );

        
        const [tickets] = await pool.query(
            `SELECT 
                ticket_id,
                title,
                customer_name,
                status,
                priority,
                created_at
            FROM support_tickets 
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?`,
            [...queryParams, limit, offset]
        );

        const totalPages = Math.ceil(countResult[0].total / limit);

        res.json({
            tickets,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error('Tickets error:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});


router.post('/api/admin/tickets/bulk-update', isAdmin, async (req, res) => {
    const { ticketIds, status, priority } = req.body;
    const userId = req.session.user.id; 

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
        return res.status(400).json({ error: 'No tickets selected' });
    }

    try {
        const updateFields = [];
        const queryParams = [];

        if (status) {
            updateFields.push('status = ?');
            queryParams.push(status);
        }

        if (priority) {
            updateFields.push('priority = ?');
            queryParams.push(priority);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No update fields provided' });
        }

        
        updateFields.push('updated_at = NOW(), updated_by = ?');
        queryParams.push(userId);

        
        queryParams.push(...ticketIds);

        const query = `
            UPDATE support_tickets 
            SET ${updateFields.join(', ')}
            WHERE ticket_id IN (${'?,'.repeat(ticketIds.length).slice(0, -1)})
        `;

        await pool.query(query, queryParams);

        
        const activityQuery = `
            INSERT INTO activity_log (user_id, action, details, created_at)
            VALUES (?, ?, ?, NOW())
        `;

        const activityDetails = JSON.stringify({
            ticketCount: ticketIds.length,
            status,
            priority
        });

        await pool.query(activityQuery, [
            userId,
            'bulk_update_tickets',
            activityDetails
        ]);

        res.json({ message: 'Tickets updated successfully' });
    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({ error: 'Failed to update tickets' });
    }
});


router.get('/api/admin/activity-log', isAdmin, async (req, res) => {
    try {
        const [logs] = await pool.query(`
            SELECT 
                al.id,
                al.user_id,
                u.username as user_name,
                al.action,
                al.details,
                al.created_at
            FROM activity_log al
            JOIN users u ON al.user_id = u.id
            WHERE u.is_admin = 1
            ORDER BY al.created_at DESC
            LIMIT 100
        `);

        res.json(logs);
    } catch (error) {
        console.error('Activity log error:', error);
        res.status(500).json({ error: 'Failed to fetch activity log' });
    }
});






router.get('/api/admin/tickets/:ticketId', isAdmin, async (req, res) => {
    try {
        const [ticket] = await pool.query(
            `SELECT * FROM support_tickets WHERE ticket_id = ?`,
            [req.params.ticketId]
        );

        if (!ticket || ticket.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json(ticket[0]);
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});


router.put('/api/admin/tickets/:ticketId', isAdmin, async (req, res) => {
    const { status, priority, title, description } = req.body;
    const userId = req.session.user.id;

    try {
        await pool.query(
            `UPDATE support_tickets 
             SET status = ?, priority = ?, title = ?, description = ?,
                 updated_at = NOW(), updated_by = ?
             WHERE ticket_id = ?`,
            [status, priority, title, description, userId, req.params.ticketId]
        );

        res.json({ message: 'Ticket updated successfully' });
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({ error: 'Failed to update ticket' });
    }
});


router.get('/api/admin/tickets/:ticketId/chat', isAdmin, async (req, res) => {
    try {
        const { ticketId } = req.params;

        
        const [ticketCheck] = await pool.query(
            'SELECT * FROM support_tickets WHERE ticket_id = ?', 
            [ticketId]
        );

        if (ticketCheck.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        
        const [messages] = await pool.query(
            `SELECT 
                tcm.message_id, 
                tcm.sender_id, 
                u.username as sender_name,
                u.is_admin,
                tcm.message_text, 
                tcm.created_at 
            FROM ticket_chat_messages tcm
            LEFT JOIN users u ON tcm.sender_id = u.id
            WHERE tcm.ticket_id = ? 
            ORDER BY tcm.created_at ASC`, 
            [ticketId]
        );

        res.json(messages);
    } catch (error) {
        console.error('Get admin chat messages error:', error);
        res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
});


router.post('/api/admin/tickets/:ticketId/chat', isAdmin, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { messageText } = req.body;

        
        if (!messageText) {
            return res.status(400).json({ error: 'Message text is required' });
        }

        
        const [ticketCheck] = await pool.query(
            'SELECT * FROM support_tickets WHERE ticket_id = ?', 
            [ticketId]
        );

        if (ticketCheck.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        
        const messageId = uuidv4();

        
        const userId = req.session.user.id;
        const username = req.session.user.username;

        
        await pool.query(
            `INSERT INTO ticket_chat_messages 
            (message_id, ticket_id, sender_id, sender_name, message_text, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())`,
            [messageId, ticketId, userId, username, messageText]
        );

        
        await pool.query(
            `UPDATE support_tickets 
            SET status = 'in_progress', 
                updated_at = NOW() 
            WHERE ticket_id = ?`, 
            [ticketId]
        );

        
        await pool.query(
            `INSERT INTO activity_log (user_id, action, details, created_at)
            VALUES (?, ?, ?, NOW())`,
            [
                userId, 
                'admin_chat_message', 
                JSON.stringify({ 
                    ticketId, 
                    messageId 
                })
            ]
        );

        res.status(201).json({ 
            message: 'Chat message sent successfully', 
            messageId 
        });
    } catch (error) {
        console.error('Admin send chat message error:', error);
        res.status(500).json({ error: 'Failed to send chat message' });
    }
});
module.exports = router;