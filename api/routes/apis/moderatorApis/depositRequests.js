const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection')

router.get('/api/moderator/pending-deposits', isModerator, async (req, res) => {
    try {
    const [countries] = await pool.query(
        'SELECT country_code FROM moderator_countries WHERE moderator_id = ?',
        [req.moderatorId]
    );
    
    const countryList = countries.map(c => c.country_code);
    
    const [transactions] = await pool.query(`
        SELECT 
            ct.id, 
            ct.recipient_phone AS phone_number,
            ct.amount, 
            ct.payment_screenshot,
            ct.status,
            ct.created_at,
            ct.country_code,
            pm.name AS payment_method
        FROM coin_transactions ct
        LEFT JOIN payment_methods pm ON ct.payment_method_id = pm.id
        WHERE ct.status = 'pending'
        AND ct.transaction_type = 'deposit'
        AND ct.country_code IN (?)
        ORDER BY ct.created_at DESC
    `, [countryList]);
    
    res.json({ transactions });
    } catch (error) {
    console.error('Error fetching pending deposits:', error);
    res.status(500).json({ error: 'Failed to fetch pending deposits' });
    }
    });

    

app.post('/api/moderator/process-deposit', isModerator, async (req, res) => {
    const { transactionId, approve } = req.body;
    
    if (!transactionId || typeof approve !== 'boolean') {
    return res.status(400).json({ error: 'Invalid input parameters' });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
    
    const [moderatorCountries] = await connection.query(
        'SELECT country_code FROM moderator_countries WHERE moderator_id = ?',
        [req.moderatorId]
    );
    
    const countryList = moderatorCountries.map(c => c.country_code);
    
    
    const [transactions] = await connection.query(`
        SELECT ct.*, u.phone_number 
        FROM coin_transactions ct
        INNER JOIN users u ON ct.recipient_phone = u.phone_number
        WHERE ct.id = ? AND ct.status = 'pending'
        AND ct.country_code IN (?)
    `, [transactionId, countryList]);
    
    if (transactions.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Transaction not found or unauthorized' });
    }
    
    const transaction = transactions[0];
    const status = approve ? 'approved' : 'rejected';
    
    
    await connection.query(
        'UPDATE coin_transactions SET status = ?, approval_date = NOW(), approved_by = ?, moderator_id = ? WHERE id = ?',
        [status, req.session.user.id, req.moderatorId, transactionId]
    );
    
    if (approve) {
        
        const [updateResult] = await connection.query(
            'UPDATE users SET coins = coins + ?, last_deposit_date = NOW() WHERE phone_number = ?',
            [transaction.amount, transaction.recipient_phone]
        );
    
        if (updateResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'User not found' });
        }
    }
    
    await connection.commit();
    res.json({ message: `Transaction ${status} successfully` });
    } catch (error) {
    await connection.rollback();
    console.error('Error processing approval:', error);
    res.status(500).json({ error: 'Internal server error' });
    } finally {
    connection.release();
    }
    });
    module.exports = router;