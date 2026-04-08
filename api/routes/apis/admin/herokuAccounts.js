const express = require('express');
const router = express.Router();
const axios = require('axios'); 
const pool = require('../../../database/sqlConnection');
const isAdmin = require('../../../middlewares/isAdmin');


router.get('/admin/heroku-accounts', isAdmin, async (req, res) => {
    try {
        const [accounts] = await pool.query(`
            SELECT 
                id, 
                email, 
                api_key,
                is_sold,
                is_valid,
                created_at,
                (SELECT COUNT(*) FROM purchased_heroku_accounts WHERE account_id = heroku_accounts.id) as purchase_count
            FROM heroku_accounts
            ORDER BY created_at DESC
        `);
        res.json(accounts);
    } catch (error) {
        console.error('Error fetching Heroku accounts:', error);
        res.status(500).json({ error: 'An error occurred while fetching Heroku accounts' });
    }
});


router.post('/admin/heroku-accounts', isAdmin, async (req, res) => {
    const { email, password, apiKey, recoveryCodes } = req.body;
    try {
        
        try {
            const response = await axios.get('https://api.heroku.com/account', {
                headers: {
                    'Accept': 'application/vnd.heroku+json; version=3',
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (response.status !== 200) {
                throw new Error('Invalid API key');
            }
        } catch (error) {
            return res.status(400).json({ error: 'Invalid Heroku API key' });
        }
    
        const [result] = await pool.query(
            'INSERT INTO heroku_accounts (email, password, api_key, recovery_codes) VALUES (?, ?, ?, ?)',
            [email, password, apiKey, recoveryCodes]
        );
        res.json({ message: 'Heroku account added successfully', id: result.insertId });
    } catch (error) {
        console.error('Error adding Heroku account:', error);
        res.status(500).json({ error: 'An error occurred while adding the Heroku account' });
    }
});


router.post('/admin/check-account-validity', isAdmin, async (req, res) => {
    const { accountId } = req.body;
    
    try {
        const [accountRows] = await pool.query(
            'SELECT api_key FROM heroku_accounts WHERE id = ?',
            [accountId]
        );
    
        if (accountRows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }
    
        const apiKey = accountRows[0].api_key;
    
        try {
            const response = await axios.get('https://api.heroku.com/account', {
                headers: {
                    'Accept': 'application/vnd.heroku+json; version=3',
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (response.status === 200) {
                await pool.query(
                    'UPDATE heroku_accounts SET is_valid = TRUE WHERE id = ?',
                    [accountId]
                );
                res.json({ valid: true });
            } else {
                throw new Error('Invalid API key');
            }
        } catch (error) {
            await pool.query(
                'UPDATE heroku_accounts SET is_valid = FALSE WHERE id = ?',
                [accountId]
            );
            res.status(400).json({ error: 'Invalid API key' });
        }
    } catch (error) {
        console.error('Error checking account validity:', error);
        res.status(500).json({ error: 'An error occurred while checking account validity' });
    }
});

module.exports = router;