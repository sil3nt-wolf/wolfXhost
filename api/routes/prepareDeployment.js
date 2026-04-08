const express = require('express');
const router = express.Router();
const isLoggedIn = require('../middlewares/isLoggedin');
const pool = require('../database/sqlConnection');


async function queryDatabase(query, params = []) {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query(query, params);
        return rows;
    } catch (error) {
        throw error;
    } finally {
        connection.release();
    }
}


router.get('/deployment/:id', isLoggedIn, async (req, res) => {
    try {
        const deployment = await queryDatabase(`
            SELECT 
                d.*, 
                b.name as bot_name,
                b.repo_url,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'var_name', dev.var_name,
                        'var_value', dev.var_value
                    )
                ) as env_vars
            FROM deployed_apps d
            JOIN bots b ON d.bot_id = b.id
            LEFT JOIN deployment_env_vars dev ON d.id = dev.deployment_id
            WHERE d.id = ?
            GROUP BY d.id
        `, [req.params.id]);

        if (deployment.length === 0) {
            return res.status(404).json({ error: 'Deployment not found' });
        }

        res.json(deployment[0]);
    } catch (error) {
        console.error('Error fetching deployment:', error);
        res.status(500).json({ error: 'Failed to fetch deployment details' });
    }
});


router.all('/dashboard/select-bot/prepare-deployment', isLoggedIn, async (req, res) => {
    const botId = req.method === 'POST' ? req.body.botId : req.query.botId;

    if (!botId) {
        return res.status(400).send('Bot ID is required');
    }

    try {
        const botRows = await queryDatabase('SELECT * FROM bots WHERE id = ?', [botId]);

        if (botRows.length === 0) {
            return res.status(404).send('Bot not found');
        }

        const bot = botRows[0];

        if (bot.is_suspended) {
            return res.render('botSuspended', {
                bot: bot,
                message: 'Sorry, this bot has been suspended due to a violation of our Terms of Service. This action was taken to maintain the safety and quality of our platform. If you believe this was done in error, please contact our support team at support@talkdrove.com with your Bot ID for further assistance.\nWe appreciate your understanding as we work to maintain a secure environment for all users.'
            });
        }

        const envVarRows = await queryDatabase('SELECT * FROM bot_env_vars WHERE bot_id = ?', [botId]);
        bot.envVars = envVarRows;

        res.render('deploy-bot', {
            bot,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error preparing deployment:', error);
        res.status(500).send('An error occurred while preparing the deployment');
    }
});


router.get('/bot-deployment/:botId', isLoggedIn, async (req, res) => {
    const botId = req.params.botId;

    try {
        const rows = await queryDatabase(`
            SELECT 
                b.*,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'var_name', bev.var_name,
                        'is_required', bev.is_required,
                        'var_description', bev.var_description
                    )
                ) as env_vars
            FROM bots b
            LEFT JOIN bot_env_vars bev ON b.id = bev.bot_id
            WHERE b.id = ?
            GROUP BY b.id
        `, [botId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        const bot = rows[0];
        const envVars = JSON.parse(bot.env_vars);
        delete bot.env_vars;

        const userRows = await queryDatabase('SELECT coins FROM users WHERE email = ?', [req.session.user.email]);

        const canDeploy = userRows[0].coins >= bot.deployment_cost;

        res.json({
            bot,
            envVars,
            userCoins: userRows[0].coins,
            canDeploy
        });
    } catch (error) {
        console.error('Error fetching bot deployment details:', error);
        res.status(500).json({ error: 'Failed to fetch bot deployment details' });
    }
});

module.exports = router;