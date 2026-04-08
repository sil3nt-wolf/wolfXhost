const express = require('express')
const router = express.Router();
const isAdmin = require('../../../../middlewares/isAdmin')
const pool = require('../../../../database/sqlConnection')


router.get('/api/admin/deposit-stats', isAdmin, async (req, res) => {
    try {
    const { startDate, endDate } = req.query;
    
    
    const [overallStats] = await pool.query(`
        SELECT 
            COUNT(*) as total_requests,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_approved_amount
        FROM coin_transactions
        WHERE transaction_type = 'deposit'
        ${startDate ? `AND created_at >= '${startDate}'` : ''}
        ${endDate ? `AND created_at <= '${endDate}'` : ''}
    `);
    
    
    const [moderatorStats] = await pool.query(`
        SELECT 
            m.id as moderator_id,
            u.phone_number as moderator_phone,
            COUNT(ct.id) as total_handled,
            SUM(CASE WHEN ct.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN ct.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
            SUM(CASE WHEN ct.status = 'approved' THEN ct.amount ELSE 0 END) as total_approved_amount
        FROM moderators m
        LEFT JOIN users u ON m.user_id = u.id
        LEFT JOIN coin_transactions ct ON ct.moderator_id = m.id
        WHERE m.status = 'active'
        ${startDate ? `AND ct.created_at >= '${startDate}'` : ''}
        ${endDate ? `AND ct.created_at <= '${endDate}'` : ''}
        GROUP BY m.id, u.phone_number
    `);
    
    res.json({
        overall: overallStats[0],
        moderatorStats
    });
    } catch (error) {
    console.error('Error fetching deposit statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
    }
    });
    
    
    router.get('/api/admin/transactions', isAdmin, async (req, res) => {
    try {
    const { startDate, endDate, status, moderatorId } = req.query;
    
    let query = `
        SELECT 
            ct.id,
            ct.recipient_phone,
            ct.amount,
            ct.status,
            ct.created_at,
            ct.approval_date,
            ct.payment_screenshot,
            pm.name as payment_method,
            u.phone_number as moderator_phone
        FROM coin_transactions ct
        LEFT JOIN payment_methods pm ON ct.payment_method_id = pm.id
        LEFT JOIN moderators m ON ct.moderator_id = m.id
        LEFT JOIN users u ON m.user_id = u.id
        WHERE ct.transaction_type = 'deposit'
    `;
    
    const params = [];
    
    if (startDate) {
        query += ` AND ct.created_at >= ?`;
        params.push(startDate);
    }
    if (endDate) {
        query += ` AND ct.created_at <= ?`;
        params.push(endDate);
    }
    if (status) {
        query += ` AND ct.status = ?`;
        params.push(status);
    }
    if (moderatorId) {
        query += ` AND ct.moderator_id = ?`;
        params.push(moderatorId);
    }
    
    query += ` ORDER BY ct.created_at DESC LIMIT 100`;
    
    const [transactions] = await pool.query(query, params);
    res.json({ transactions });
    } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
    }
    });