const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const { v4: uuidv4 } = require('uuid');


const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};


router.use(express.json());


const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.email) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};


router.post('/api/support/tickets', isAuthenticated, asyncHandler(async (req, res) => {
    const { 
        title, 
        description, 
        priority = 'medium', 
        category, 
        customerName, 
        customerEmail 
    } = req.body;

    
    if (!title || !description || !customerName || !customerEmail) {
        return res.status(400).json({ 
            error: 'Missing required fields' 
        });
    }

    
    const ticketId = uuidv4();

    
    const query = `
        INSERT INTO support_tickets 
        (ticket_id, title, description, priority, category, customer_name, customer_email, status, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    await pool.query(query, [
        ticketId, 
        title, 
        description, 
        priority, 
        category || 'general', 
        customerName, 
        customerEmail, 
        'open'
    ]);

    res.status(201).json({ 
        message: 'Ticket created successfully', 
        ticketId 
    });
}));


router.get('/api/support/tickets', isAuthenticated, asyncHandler(async (req, res) => {
    const { 
        status, 
        priority, 
        category, 
        page = 1, 
        limit = 10 
    } = req.query;

    const userEmail = req.session.user.email;

    let query = `
        SELECT * FROM support_tickets 
        WHERE customer_email = ?
    `;
    const queryParams = [userEmail];

    if (status) {
        query += ' AND status = ?';
        queryParams.push(status);
    }

    if (priority) {
        query += ' AND priority = ?';
        queryParams.push(priority);
    }

    if (category) {
        query += ' AND category = ?';
        queryParams.push(category);
    }

    
    const offset = (page - 1) * limit;
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), offset);

    const [tickets] = await pool.query(query, queryParams);

    
    const [countResult] = await pool.query(`
        SELECT COUNT(*) as total FROM support_tickets 
        WHERE customer_email = ?
        ${status ? 'AND status = ?' : ''} 
        ${priority ? 'AND priority = ?' : ''} 
        ${category ? 'AND category = ?' : ''}
    `, [userEmail, ...queryParams.slice(1)]);

    res.json({
        tickets,
        pagination: {
            total: countResult[0].total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(countResult[0].total / limit)
        }
    });
}));


router.get('/api/support/tickets/:ticketId', isAuthenticated, asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const userEmail = req.session.user.email;

    const [tickets] = await pool.query(
        'SELECT * FROM support_tickets WHERE ticket_id = ? AND customer_email = ?', 
        [ticketId, userEmail]
    );

    if (tickets.length === 0) {
        return res.status(404).json({ 
            error: 'Ticket not found or you do not have access to this ticket' 
        });
    }

    res.json(tickets[0]);
}));


router.patch('/api/support/tickets/:ticketId', isAuthenticated, asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const userEmail = req.session.user.email;
    const { 
        status, 
        priority, 
        assignedTo, 
        notes 
    } = req.body;

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

    if (assignedTo) {
        updateFields.push('assigned_to = ?');
        queryParams.push(assignedTo);
    }

    if (notes) {
        updateFields.push('notes = ?');
        queryParams.push(notes);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ 
            error: 'No update fields provided' 
        });
    }

    queryParams.push(ticketId, userEmail);

    const query = `
        UPDATE support_tickets 
        SET ${updateFields.join(', ')}, updated_at = NOW() 
        WHERE ticket_id = ? AND customer_email = ?
    `;

    const [result] = await pool.query(query, queryParams);

    if (result.affectedRows === 0) {
        return res.status(404).json({ 
            error: 'Ticket not found or you do not have access to this ticket' 
        });
    }

    res.json({ 
        message: 'Ticket updated successfully' 
    });
}));


router.delete('/api/support/tickets/:ticketId', isAuthenticated, asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const userEmail = req.session.user.email;

    const [result] = await pool.query(
        'DELETE FROM support_tickets WHERE ticket_id = ? AND customer_email = ?', 
        [ticketId, userEmail]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ 
            error: 'Ticket not found or you do not have access to this ticket' 
        });
    }

    res.json({ 
        message: 'Ticket deleted successfully' 
    });
}));


router.post('/api/tickets/:ticketId/replies', isAuthenticated, asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const { replyText, isInternal = false } = req.body;
    const userEmail = req.session.user.email;

    
    if (!replyText) {
        return res.status(400).json({ error: 'Reply text is required' });
    }

    
    const [ticketCheck] = await pool.query(
        'SELECT * FROM support_tickets WHERE ticket_id = ? AND customer_email = ?', 
        [ticketId, userEmail]
    );

    if (ticketCheck.length === 0) {
        return res.status(404).json({ error: 'Ticket not found or you do not have access to this ticket' });
    }

    
    const replyId = uuidv4();

    
    await pool.query(
        `INSERT INTO ticket_replies 
        (reply_id, ticket_id, user_id, username, reply_text, is_internal, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [replyId, ticketId, req.session.user.id, req.session.user.username, replyText, isInternal]
    );

    
    await pool.query(
        `UPDATE support_tickets 
        SET status = 'in_progress', 
            updated_at = NOW() 
        WHERE ticket_id = ? AND customer_email = ?`, 
        [ticketId, userEmail]
    );

    res.status(201).json({ 
        message: 'Reply added successfully', 
        replyId 
    });
}));


router.get('/api/tickets/:ticketId/replies', isAuthenticated, asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const userEmail = req.session.user.email;

    
    const [ticketCheck] = await pool.query(
        'SELECT * FROM support_tickets WHERE ticket_id = ? AND customer_email = ?', 
        [ticketId, userEmail]
    );

    if (ticketCheck.length === 0) {
        return res.status(404).json({ error: 'Ticket not found or you do not have access to this ticket' });
    }

    
    const [replies] = await pool.query(
        `SELECT 
            reply_id, 
            user_id, 
            username, 
            reply_text, 
            is_internal, 
            created_at 
        FROM ticket_replies 
        WHERE ticket_id = ? 
        ORDER BY created_at ASC`, 
        [ticketId]
    );

    res.json(replies);
}));


router.post('/api/tickets/:ticketId/chat', isAuthenticated, asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const { messageText } = req.body;
    const userEmail = req.session.user.email;
    const userName = req.session.user.username;

    
    if (!messageText) {
        return res.status(400).json({ error: 'Message text is required' });
    }

    
    const [ticketCheck] = await pool.query(
        'SELECT * FROM support_tickets WHERE ticket_id = ? AND customer_email = ?', 
        [ticketId, userEmail]
    );

    if (ticketCheck.length === 0) {
        return res.status(404).json({ error: 'Ticket not found or you do not have access to this ticket' });
    }

    
    const messageId = uuidv4();

    
    await pool.query(
        `INSERT INTO ticket_chat_messages 
        (message_id, ticket_id, sender_id, sender_name, message_text, created_at) 
        VALUES (?, ?, ?, ?, ?, NOW())`,
        [messageId, ticketId, req.session.user.id, userName, messageText]
    );

    
    await pool.query(
        `UPDATE support_tickets 
        SET status = 'in_progress', 
            updated_at = NOW() 
        WHERE ticket_id = ? AND customer_email = ?`, 
        [ticketId, userEmail]
    );

    res.status(201).json({ 
        message: 'Chat message sent successfully', 
        messageId 
    });
}));


router.get('/api/tickets/:ticketId/chat', isAuthenticated, asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const userEmail = req.session.user.email;

    
    const [ticketCheck] = await pool.query(
        'SELECT * FROM support_tickets WHERE ticket_id = ? AND customer_email = ?', 
        [ticketId, userEmail]
    );

    if (ticketCheck.length === 0) {
        return res.status(404).json({ error: 'Ticket not found or you do not have access to this ticket' });
    }

    
    const [messages] = await pool.query(
        `SELECT 
            message_id, 
            sender_id, 
            sender_name, 
            message_text, 
            created_at 
        FROM ticket_chat_messages 
        WHERE ticket_id = ? 
        ORDER BY created_at ASC`, 
        [ticketId]
    );

    res.json(messages);
}));


module.exports = router;