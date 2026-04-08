const express = require('express');
const pool = require('../../../database/sqlConnection');

const Router = express.Router();


const validateApiKey = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'No API key provided'
        });
    }
    
    const apiKey = authHeader.split(' ')[1];
    
    if (apiKey !== process.env.HTD_API_KEY) {
        return res.status(401).json({
            success: false,
            message: 'Invalid API key'
        });
    }
    
    next();
};

Router.post('/api/v1/wallet/transfer', validateApiKey, async (req, res) => {
    const { amount, recipient, app_id, description, payment_method_id, country_code } = req.body;

    if (!amount || !recipient  ) {
        return res.status(400).json({
            success: false,
            message: 'Missing required parameters'
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [recipientData] = await connection.query(
            'SELECT id, email AS recipient_email, username AS recipient_username FROM users WHERE email = ? OR username = ?',
            [recipient, recipient]
        );

        if (recipientData.length === 0) {
            throw new Error('Recipient not found');
        }

        const recipientInfo = recipientData[0];

        await connection.query(
            'UPDATE users SET coins = coins + ? WHERE id = ?',
            [amount, recipientInfo.id]
        );

        await connection.query(
            `INSERT INTO coin_transactions 
            (amount, transaction_type, transaction_date, app_id, 
            description, status, payment_method_id, country_code, recipient_username, 
            recipient_email, created_at) 
            VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                amount, 
                'transfer',  
                app_id, 
                description || 'Wallet Transfer', 
                'pending', 
                payment_method_id, 
                country_code, 
                recipientInfo.recipient_username, 
                recipientInfo.recipient_email
            ]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Transfer successful'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Transfer error:', error);

        res.status(500).json({
            success: false,
            message: error.message || 'Transfer failed'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = Router;
