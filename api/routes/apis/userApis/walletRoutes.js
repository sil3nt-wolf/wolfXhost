const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const isLoggedIn = require('../../../middlewares/isLoggedin');


router.get('/api/wallet', isLoggedIn, async (req, res) => {
    try {
        const userEmail = req.session.user.email;
        
        
        const [user] = await pool.query('SELECT coins FROM users WHERE email = ?', [userEmail]);
        
        const [transactions] = await pool.query(`
            SELECT * FROM coin_transactions 
            WHERE sender_email = ? OR recipient_email = ?
            ORDER BY transaction_date DESC
            LIMIT 10
        `, [userEmail, userEmail]);
        
        const [deployments] = await pool.query(`
            SELECT COUNT(*) as count, SUM(cost) as total_cost 
            FROM deployed_apps
            WHERE user_id = (SELECT id FROM users WHERE email = ?)
        `, [userEmail]);
        
        res.json({
            coins: user[0].coins,
            recentTransactions: transactions,
            deployments: deployments[0]
        });
    } catch (error) {
        console.error('Error fetching wallet info:', error);
        res.status(500).json({ error: 'An error occurred while fetching wallet information' });
    }
});


router.post('/api/send-coins', isLoggedIn, async (req, res) => {
    const { recipient, amount } = req.body;
    const senderEmail = req.session.user.email;
    
    
    const isEmail = recipient.includes('@');
    const recipientIdentifier = isEmail ? 'email' : 'username';

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        
        const [sender] = await connection.query('SELECT coins FROM users WHERE email = ?', [senderEmail]);
        if (sender[0].coins < amount) {
            await connection.rollback();
            return res.status(400).json({ error: 'Insufficient coins' });
        }
        
       
const [recipientData] = await connection.query(`SELECT id FROM users WHERE ${recipientIdentifier} = ?`, [recipient]);
if (recipientData.length === 0) {
    await connection.rollback();
    return res.status(404).json({ error: 'Recipient not found' });
}


const [senderUser] = await connection.query('SELECT id FROM users WHERE email = ?', [senderEmail]);
if (senderUser[0].id === recipientData[0].id) {
    await connection.rollback();
    return res.status(400).json({ error: 'You cannot send coins to yourself' });
}

const [updateSenderResult] = await connection.query(
    'UPDATE users SET coins = coins - ? WHERE email = ?',
    [amount, senderEmail]
);



await connection.query(`UPDATE users SET coins = coins + ? WHERE ${recipientIdentifier} = ?`, [amount, recipient]);



await connection.query(`
    INSERT INTO coin_transactions (sender_email, recipient_email, amount)
    VALUES (?, ?, ?)
`, [senderEmail, recipient, amount]);

        await connection.commit();
        res.json({ message: 'Coins sent successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error sending coins:', error);
        res.status(500).json({ error: 'An error occurred while sending coins' });
    } finally {
        connection.release();
    }
});

module.exports = router;