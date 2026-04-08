const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const isLoggedIn = require('../../../middlewares/isLoggedin');
const axios = require('axios');


router.post('/buy-heroku-account', isLoggedIn, async (req, res) => {
    const userId = req.session.user.id;
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
    
        
        const [userRows] = await connection.query(
            'SELECT coins FROM users WHERE id = ? FOR UPDATE',
            [userId]
        );
    
        if (userRows.length === 0 || userRows[0].coins < 500) {
            await connection.rollback();
            return res.status(400).json({ error: 'Insufficient coins' });
        }
    
        
        const [accountRows] = await connection.query(
            'SELECT id, api_key FROM heroku_accounts WHERE is_sold = FALSE AND is_valid = TRUE ORDER BY created_at ASC FOR UPDATE'
        );
    
        if (accountRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'No accounts available' });
        }
    
        let validAccount = null;
    
        
        for (const account of accountRows) {
            try {
                const response = await axios.get('https://api.heroku.com/account', {
                    headers: {
                        'Accept': 'application/vnd.heroku+json; version=3',
                        'Authorization': `Bearer ${account.api_key}`
                    }
                });
                
                if (response.status === 200) {
                    validAccount = account;
                    break;
                }
            } catch (error) {
                console.error(`Account ${account.id} verification failed:`, error.message);
                
                await connection.query(
                    'UPDATE heroku_accounts SET is_valid = FALSE WHERE id = ?',
                    [account.id]
                );
            }
        }
    
        if (!validAccount) {
            await connection.rollback();
            return res.status(400).json({ error: 'No valid accounts available. Please try again later.' });
        }
    
        
        await connection.query(
            'UPDATE users SET coins = coins - 500 WHERE id = ?',
            [userId]
        );
    
        await connection.query(
            'UPDATE heroku_accounts SET is_sold = TRUE WHERE id = ?',
            [validAccount.id]
        );
    
        await connection.query(
            'INSERT INTO purchased_heroku_accounts (user_id, account_id) VALUES (?, ?)',
            [userId, validAccount.id]
        );
    
        await connection.commit();
        res.json({ message: 'Heroku account purchased successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error purchasing Heroku account:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;