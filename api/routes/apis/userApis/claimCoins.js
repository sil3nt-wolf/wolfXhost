const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const isLoggedIn = require('../../../middlewares/isLoggedin');
const moment = require('moment-timezone');


router.post('/claim-coins', isLoggedIn, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const dailyCoins = 10;
        const pakistanTime = moment().tz('Asia/Karachi');
        const todayDate = pakistanTime.format('YYYY-MM-DD');
        
        
        const [userRows] = await connection.query(
            'SELECT id, last_claim_date, coins FROM users WHERE email = ? FOR UPDATE',
            [req.session.user.email]
        );

        if (userRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userRows[0];
        
        
        if (user.last_claim_date && user.last_claim_date.toISOString().split('T')[0] === todayDate) {
            await connection.rollback();
            
            
            const nextClaimTime = pakistanTime.clone().add(1, 'day').startOf('day');
            
            return res.status(400).json({
                message: 'You can only claim coins once per day',
                nextClaimTime: nextClaimTime.format(),
                currentCoins: user.coins,
                error: true
            });
        }

        
        await connection.query(
            'UPDATE users SET coins = coins + ?, last_claim_date = ? WHERE email = ?',
            [dailyCoins, todayDate, req.session.user.email]
        );

        await connection.commit();

        
        const newCoinBalance = user.coins + dailyCoins;
        
        
        const nextClaimTime = pakistanTime.clone().add(1, 'day').startOf('day');

        res.status(200).json({
            message: `${dailyCoins} coins claimed successfully!`,
            currentCoins: newCoinBalance,
            nextClaimTime: nextClaimTime.format(),
            success: true
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error claiming coins:', error);
        res.status(500).json({
            message: 'An error occurred while claiming coins',
            error: true
        });
    } finally {
        connection.release();
    }
});


router.get('/check-claim-status', isLoggedIn, async (req, res) => {
    try {
        const [userRows] = await pool.query(
            'SELECT last_claim_date, coins FROM users WHERE email = ?',
            [req.session.user.email]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userRows[0];
        const pakistanTime = moment().tz('Asia/Karachi');
        const todayDate = pakistanTime.format('YYYY-MM-DD');
        
        
        const alreadyClaimedToday = user.last_claim_date && 
                                  user.last_claim_date.toISOString().split('T')[0] === todayDate;
        
        
        const canClaim = !alreadyClaimedToday;
        
        
        const nextClaimTime = canClaim ? null : pakistanTime.clone().add(1, 'day').startOf('day').format();

        res.json({
            canClaim,
            nextClaimTime,
            currentCoins: user.coins,
            alreadyClaimedToday,
            
            serverTime: pakistanTime.format(),
            todayDate,
            lastClaimDate: user.last_claim_date ? user.last_claim_date.toISOString().split('T')[0] : null
        });
    } catch (error) {
        console.error('Error checking claim status:', error);
        res.status(500).json({ error: 'An error occurred while checking claim status' });
    }
});

module.exports = router;