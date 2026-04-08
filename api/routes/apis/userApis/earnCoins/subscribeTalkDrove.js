const express = require('express');
const router = express.Router();
const pool = require('../../../../database/sqlConnection');
const isLoggedIn = require('../../../../middlewares/isLoggedin');


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


const MAX_RETRIES = 3;


router.get('/api/youtube-subscription-status', isLoggedIn, async (req, res) => {
    try {
        const email = req.session.user.email;
        const [subscribed] = await pool.query(
            'SELECT id FROM youtube_subscriptions WHERE user_email = ? AND channel_id = ?',
            [email, 'TalkDrove']
        );
        
        res.json({ subscribed: subscribed.length > 0 });
    } catch (error) {
        console.error('Error checking subscription status:', error);
        res.status(500).json({ error: 'Error checking subscription status' });
    }
});

router.post('/api/youtube-subscribe', isLoggedIn, async (req, res) => {
    let retries = 0;
    const email = req.session.user.email;
    const REWARD_AMOUNT = 10;
    const CHANNEL_ID = 'TalkDrove';

    async function attemptTransaction() {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            
            const [subscribed] = await connection.query(
                'SELECT id FROM youtube_subscriptions WHERE user_email = ? AND channel_id = ? FOR UPDATE',
                [email, CHANNEL_ID]
            );

            if (subscribed.length > 0) {
                await connection.rollback();
                return { 
                    success: false, 
                    error: 'You have already received rewards for subscribing to this channel',
                    status: 400
                };
            }

            
            const [user] = await connection.query(
                'SELECT id FROM users WHERE email = ? FOR UPDATE',
                [email]
            );

            if (!user.length) {
                await connection.rollback();
                return { 
                    success: false, 
                    error: 'User not found',
                    status: 404
                };
            }

            
            await connection.query(
                'INSERT INTO youtube_subscriptions (user_email, channel_id, verified_at) VALUES (?, ?, NOW())',
                [email, CHANNEL_ID]
            );

            await connection.query(
                'UPDATE users SET coins = coins + ? WHERE email = ?',
                [REWARD_AMOUNT, email]
            );

            await connection.query(
                `INSERT INTO coin_transactions 
                (recipient_email, amount, transaction_type, description) 
                VALUES (?, ?, ?, ?)`,
                [email, REWARD_AMOUNT, 'youtube_subscribe_reward', 'Reward for subscribing to TalkDrove']
            );

            await connection.commit();
            return { success: true };

        } catch (error) {
            await connection.rollback();
            
            if ((error.errno === 1213 || error.errno === 1205) && retries < MAX_RETRIES) {
                return { retry: true };
            }
            
            throw error;
        } finally {
            connection.release();
        }
    }

    try {
        while (retries < MAX_RETRIES) {
            const result = await attemptTransaction();
            
            if (!result.retry) {
                if (!result.success) {
                    return res.status(result.status).json({ error: result.error });
                }
                return res.json({ success: true, message: 'Subscription reward added successfully' });
            }
            
            retries++;
            if (retries < MAX_RETRIES) {
                await sleep(100 * Math.pow(2, retries));
            }
        }

        throw new Error('Maximum retries exceeded');

    } catch (error) {
        console.error('Error processing YouTube subscription:', error);
        res.status(500).json({ 
            error: 'An error occurred while processing subscription. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;