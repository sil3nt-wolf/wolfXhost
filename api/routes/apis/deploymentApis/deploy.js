const deployWithMultipleKeys = require('./deployWithMultipleKeys');
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const pool = require('../../../database/sqlConnection');
const isLoggedIn = require('../../../middlewares/isLoggedin');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(express.static('public'));


router.post('/deploy', isLoggedIn, async (req, res) => {
    console.log('Request Body:', req.body);
    const { botId, appName, ...envVars } = req.body;
    const envValues = Object.keys(envVars).reduce((acc, key) => {
        const match = key.match(/^envVars\[(.+)\]$/);
        if (match) {
            acc[match[1]] = envVars[key];
        }
        return acc;
    }, {});

    if (Object.keys(envValues).length === 0) {
        return res.status(400).json({ error: 'Environment variables are required' });
    }

    if (!botId) {
        return res.status(400).json({ error: 'Bot ID is required' });
    }

    if (!appName) {
        return res.status(400).json({ error: 'App name is required' });
    }

    
    const herokuAppName = `${appName}-td`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    try {
        const [userRows] = await pool.query(
            'SELECT id, coins, email FROM users WHERE email = ?',
            [req.session.user.email]
        );

        if (!userRows.length) {
            return res.status(400).json({ error: 'User not found' });
        }

        const [botRows] = await pool.query(
            'SELECT deployment_cost, dev_email FROM bots WHERE id = ?',
            [botId]
        );

        if (!botRows.length) {
            return res.status(400).json({ error: 'Bot not found' });
        }

        const deploymentCost = botRows[0].deployment_cost;
        const dev_email = botRows[0].dev_email;
        const userCoins = userRows[0].coins;
        const devShare = Math.floor(deploymentCost * 0.2);

        if (userCoins < deploymentCost) {
            return res.status(400).json({
                error: 'Insufficient coins',
                required: deploymentCost,
                available: userCoins
            });
        }

        
        const result = await deployWithMultipleKeys(botId, envValues, userRows[0].id, herokuAppName);

        if (!result.success) {
            return res.status(500).json({ error: 'Deployment failed', details: result.message });
        }

        
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            
            const [currentUserRows] = await connection.query(
                'SELECT coins FROM users WHERE id = ? FOR UPDATE',
                [userRows[0].id]
            );

            if (currentUserRows[0].coins < deploymentCost) {
                await connection.rollback();
                return res.status(400).json({
                    error: 'Insufficient coins (balance changed)',
                    required: deploymentCost,
                    available: currentUserRows[0].coins
                });
            }

            
            await connection.query(
                'UPDATE users SET coins = coins - ? WHERE id = ?',
                [deploymentCost, userRows[0].id]
            );

            
            await connection.query(
                'UPDATE users SET coins = coins + ? WHERE email = ?',
                [devShare, dev_email]
            );

            
            await connection.commit();

            
            pool.query(
                'INSERT INTO coin_transactions (sender_email, amount, transaction_type) VALUES (?, ?, ?)',
                [req.session.user.email, deploymentCost, 'deployment']
            );

            pool.query(
                'INSERT INTO coin_transactions (sender_email, receiver_email, amount, transaction_type) VALUES (?, ?, ?, ?)',
                [req.session.user.email, dev_email, devShare, 'dev_share']
            );

            res.json({
                success: true,
                message: 'Bot deployed successfully',
                
                deploymentId: result.deploymentId,
                coinsDeducted: deploymentCost,
                devShare: devShare,
                remainingCoins: currentUserRows[0].coins - deploymentCost
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Deployment error:', error);
        res.status(500).json({
            error: 'Deployment failed',
            message: error.message,
            details: error.stack
        });
    }
});

module.exports = router;