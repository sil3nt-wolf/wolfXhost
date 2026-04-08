const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const isLoggedIn = require('../../../middlewares/isLoggedin');
const transporter = require('../../../database/emailConnection');
const axios = require('axios');


async function validateRepoOwnership(repoUrl, userEmail) {
    try {
        
        const rawUrl = `https://raw.githubusercontent.com/${repoUrl}/main/talkdrove.json?t=${Date.now()}`;
        
        const response = await axios.get(rawUrl);
        
        if (response.status !== 200) {
            return { 
                valid: false, 
                error: 'Could not find talkdrove.json in repository',
                code: 404
            };
        }
        
        
        if (response.data['owner-verification'] !== userEmail) {
            return { 
                valid: false, 
                error: 'The email in talkdrove.json does not match your account email',
                code: 403
            };
        }
        
        return { valid: true, config: response.data };
    } catch (error) {
        console.error('Error validating repository ownership:', error);
        return { 
            valid: false, 
            error: `Failed to validate repository ownership: ${error.message}`,
            code: 500
        };
    }
}


router.post('/api/fetch-repo-config', isLoggedIn, async (req, res) => {
    const { repoUrl } = req.body;
    
    try {
        
        const rawUrl = `https://raw.githubusercontent.com/${repoUrl}/main/talkdrove.json`;
        
        const response = await axios.get(rawUrl);
        
        if (response.status !== 200) {
            return res.status(404).json({ error: 'Could not find talkdrove.json in repository' });
        }
        
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching repository configuration:', error);
        res.status(500).json({ 
            error: 'Failed to fetch repository configuration',
            details: error.message
        });
    }
});


router.post('/api/verify-bot-ownership', isLoggedIn, async (req, res) => {
    const { ownerEmail } = req.body;
    const userEmail = req.session.user.email;
    
    
    if (ownerEmail === userEmail) {
        return res.json({ verified: true });
    } else {
        return res.status(403).json({ 
            error: 'Email verification failed',
            message: 'The email in talkdrove.json does not match your account email'
        });
    }
});
router.post('/bot-request', isLoggedIn, async (req, res) => {
    const { name, repoUrl, envVars, deploymentCost, websiteUrl } = req.body;
    const userEmail = req.session.user.email;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        
        const [existingRepo] = await connection.query(`
            SELECT 
                'bot_request' as type, 
                id, 
                status 
            FROM bot_requests 
            WHERE repo_url = ? AND status IN ('pending', 'approved')
            UNION
            SELECT 
                'bot' as type, 
                id, 
                status 
            FROM bots 
            WHERE repo_url = ?
        `, [repoUrl, repoUrl]);

        if (existingRepo.length > 0) {
            const existingItem = existingRepo[0];
            let errorMessage = '';
            
            if (existingItem.type === 'bot_request') {
                errorMessage = `This repository is already part of a ${existingItem.status} bot request.`;
            } else {
                errorMessage = `This repository is already connected to an existing bot.`;
            }
            
            return res.status(409).json({ 
                error: 'Repository already exists', 
                message: errorMessage 
            });
        }

        
        const validation = await validateRepoOwnership(repoUrl, userEmail);
        if (!validation.valid) {
            return res.status(validation.code).json({ 
                error: 'Repository validation failed', 
                message: validation.error 
            });
        }

        
        const [result] = await connection.query(
            'INSERT INTO bot_requests (name, repo_url, dev_email, deployment_cost, website_url, status) VALUES (?, ?, ?, ?, ?, ?)',
            [name, repoUrl, userEmail, deploymentCost, websiteUrl, 'pending']
        );
        const requestId = result.insertId;

        
        if (envVars && envVars.length > 0) {
            const envVarValues = envVars.map(envVar => [
                requestId, envVar.name, envVar.description, envVar.required ? 1 : 0
            ]);
            
            await connection.query(
                'INSERT INTO bot_request_env_vars (request_id, var_name, var_description, required) VALUES ?',
                [envVarValues]
            );
        }

        
        try {
            await transporter.sendMail({
                from: '"TalkDrove Bot Service" <msg@talkdrove.com>',
                to: 'talkdrove@gmail.com',
                subject: `New Bot Request: ${name}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td align="center" style="padding: 40px 0;">
                                    <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                                        <tr>
                                            <td style="padding: 30px 40px 20px; text-align: left; background-color: #2196F3; border-radius: 8px 8px 0 0;">
                                                <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 24px; color: white;">
                                                    New Bot Request Received
                                                </h1>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 20px 40px;">
                                                <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #555555;">
                                                    A new bot request has been submitted with the following details:
                                                </p>
                                                
                                                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                                    <tr>
                                                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #555555;">Bot Name:</td>
                                                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-family: Arial, sans-serif; font-size: 14px; color: #555555;">${name}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #555555;">Repository URL:</td>
                                                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-family: Arial, sans-serif; font-size: 14px; color: #555555;">${repoUrl}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #555555;">Developer Email:</td>
                                                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-family: Arial, sans-serif; font-size: 14px; color: #555555;">${userEmail}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #555555;">Website URL:</td>
                                                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-family: Arial, sans-serif; font-size: 14px; color: #555555;">${websiteUrl || 'N/A'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #555555;">Request ID:</td>
                                                        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-family: Arial, sans-serif; font-size: 14px; color: #555555;">${requestId}</td>
                                                    </tr>
                                                </table>
                                                
                                                <div style="text-align: center; margin: 30px 0;">
                                                    <a href="https://host.talkdrove.com/hamza" style="display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; border-radius: 4px;">
                                                        Review Bot Request
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                `
            });
        } catch (emailError) {
            
            console.error('Failed to send admin notification email:', emailError);
        }

        await connection.commit();
        res.json({
            success: true,
            message: 'Bot request submitted successfully',
            requestId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error submitting bot request:', error);
        res.status(500).json({ error: 'An error occurred while submitting the bot request' });
    } finally {
        connection.release();
    }
});

router.get('/my-bot-requests', isLoggedIn, async (req, res) => {
    try {
        const [requests] = await pool.query(`
            SELECT br.*, 
                GROUP_CONCAT(DISTINCT CONCAT(bre.var_name, ':', bre.var_description) SEPARATOR '||') as env_vars
            FROM bot_requests br
            LEFT JOIN bot_request_env_vars bre ON br.id = bre.request_id
            WHERE br.dev_email = ?
            GROUP BY br.id
            ORDER BY br.created_at DESC
        `, [req.session.user.email]);

        const formattedRequests = requests.map(request => ({
            ...request,
            env_vars: request.env_vars ? request.env_vars.split('||').map(env => {
                const [name, description] = env.split(':');
                return { name, description };
            }) : []
        }));

        res.json(formattedRequests);
    } catch (error) {
        console.error('Error fetching bot requests:', error);
        res.status(500).json({ error: 'An error occurred while fetching bot requests' });
    }
});

router.get('/my-bots', isLoggedIn, async (req, res) => {
    if (!req.session.user || !req.session.user.email) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    try {
        
        const [existingBots] = await pool.query(`
            SELECT 
                b.id,
                b.name,
                b.repo_url,
                b.website_url,
                b.status,
                b.deployment_cost,
                b.created_at,
                bcr.id as change_request_id,
                bcr.name as pending_name,
                bcr.repo_url as pending_repo_url,
                bcr.website_url as pending_website_url,
                bcr.status as change_request_status,
                GROUP_CONCAT(DISTINCT CONCAT(be.var_name, ':', be.var_description) SEPARATOR '||') as env_vars,
                GROUP_CONCAT(DISTINCT CONCAT(bcre.var_name, ':', bcre.var_description) SEPARATOR '||') as pending_env_vars
            FROM bots b
            LEFT JOIN bot_change_requests bcr ON b.id = bcr.bot_id AND bcr.status = 'pending'
            LEFT JOIN bot_env_vars be ON b.id = be.bot_id
            LEFT JOIN bot_change_request_env_vars bcre ON bcr.id = bcre.change_request_id
            WHERE b.dev_email = ?
            GROUP BY b.id, bcr.id
        `, [req.session.user.email]);

        
        const [pendingBotRequests] = await pool.query(`
            SELECT 
                br.id,
                br.name,
                br.repo_url AS repo_url,
                br.website_url,
                br.status,
                br.deployment_cost,
                br.created_at,
                GROUP_CONCAT(DISTINCT CONCAT(bre.var_name, ':', bre.var_description) SEPARATOR '||') as env_vars
            FROM bot_requests br
            LEFT JOIN bot_request_env_vars bre ON br.id = bre.request_id
            WHERE br.dev_email = ? 
            AND br.status IN ('pending', 'approved', 'suspended', 'rejected')
            GROUP BY br.id
        `, [req.session.user.email]);

        
        const formattedBots = existingBots.map(bot => ({
            id: bot.id,
            name: bot.name,
            repo_url: bot.repo_url,
            website_url: bot.website_url,
            status: bot.status,
            deployment_cost: bot.deployment_cost,
            created_at: bot.created_at,
            env_vars: bot.env_vars ? bot.env_vars.split('||').map(env => {
                const [name, description] = env.split(':');
                return { name, description };
            }) : [],
            pending_changes: bot.change_request_id ? {
                id: bot.change_request_id,
                name: bot.pending_name,
                repo_url: bot.pending_repo_url,
                website_url: bot.pending_website_url,
                env_vars: bot.pending_env_vars ? bot.pending_env_vars.split('||').map(env => {
                    const [name, description] = env.split(':');
                    return { name, description };
                }) : []
            } : null,
            type: 'existing_bot'
        }));

        
        const formattedPendingBots = pendingBotRequests.map(request => ({
            id: request.id,
            name: request.name,
            repo_url: request.repo_url,
            website_url: request.website_url,
            status: request.status,
            deployment_cost: request.deployment_cost,
            created_at: request.created_at,
            env_vars: request.env_vars ? request.env_vars.split('||').map(env => {
                const [name, description] = env.split(':');
                return { name, description };
            }) : [],
            pending_changes: null,
            type: 'bot_request'
        }));

        
        const combinedBots = [...formattedBots, ...formattedPendingBots];

        res.json(combinedBots);
    } catch (error) {
        console.error('Detailed error fetching bots:', error);
        res.status(500).json({ 
            error: 'An error occurred while fetching bots', 
            details: error.message 
        });
    }
});


router.put('/bot/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const { name, repoUrl, websiteUrl, envVars } = req.body;
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
    
        
        const [bot] = await connection.query(
            'SELECT * FROM bots WHERE id = ? AND dev_email = ?',
            [id, req.session.user.email]
        );
    
        if (!bot.length) {
            return res.status(404).json({ error: 'Bot not found or unauthorized' });
        }
        
        
        if (repoUrl && repoUrl !== bot[0].repo_url) {
            const validation = await validateRepoOwnership(repoUrl, req.session.user.email);
            
            if (!validation.valid) {
                return res.status(validation.code).json({ 
                    error: 'Repository validation failed', 
                    message: validation.error 
                });
            }
        }
    
        
        await connection.query(
            'UPDATE bots SET name = ?, repo_url = ?, website_url = ? WHERE id = ?',
            [name, repoUrl, websiteUrl, id]
        );
    
        
        await connection.query('DELETE FROM bot_env_vars WHERE bot_id = ?', [id]);
        if (envVars && envVars.length > 0) {
            const envVarValues = envVars.map(envVar => [
                id, envVar.name, envVar.description
            ]);
            await connection.query(
                'INSERT INTO bot_env_vars (bot_id, var_name, var_description) VALUES ?',
                [envVarValues]
            );
        }
    
        await connection.commit();
        res.json({ success: true, message: 'Bot updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating bot:', error);
        res.status(500).json({ error: 'An error occurred while updating the bot' });
    } finally {
        connection.release();
    }
});

router.delete('/bots/:id', isLoggedIn, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
    
        let botId = null;
    
        
        const [botResult] = await connection.query(
            'SELECT id, dev_email FROM bots WHERE id = ? AND dev_email = ?',
            [req.params.id, req.session.user.email]
        );
    
        if (botResult.length > 0) {
            botId = botResult[0].id;
    
            
            await connection.query('DELETE FROM bot_env_vars WHERE bot_id = ?', [botId]);
            await connection.query('DELETE FROM deployed_apps WHERE bot_id = ?', [botId]);
            await connection.query('DELETE FROM bot_change_requests WHERE bot_id = ?', [botId]);
            await connection.query('DELETE FROM bots WHERE id = ?', [botId]);
        } else {
            
            const [botRequestResult] = await connection.query(
                'SELECT id FROM bot_requests WHERE id = ? AND dev_email = ?',
                [req.params.id, req.session.user.email]
            );
    
            if (botRequestResult.length > 0) {
                botId = botRequestResult[0].id;
    
                
                await connection.query('DELETE FROM bot_request_env_vars WHERE request_id = ?', [botId]);
                await connection.query('DELETE FROM bot_requests WHERE id = ?', [botId]);
            }
        }
    
        if (!botId) {
            console.error('Not found');
            await connection.rollback();
            return res.status(404).json({ error: 'Bot or bot request not found or unauthorized' });
        }
    
        await connection.commit();
        res.json({ success: true, message: 'Bot or bot request deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting bot or bot request:', error);
        res.status(500).json({
            error: 'An error occurred while deleting the bot or bot request',
            details: error.message
        });
    } finally {
        connection.release();
    }
});
    
router.get('/bot-request/:id', isLoggedIn, async (req, res) => {
    try {
        const [request] = await pool.query(`
            SELECT br.*, 
                GROUP_CONCAT(DISTINCT CONCAT(bre.var_name, ':', bre.var_description) SEPARATOR '||') as env_vars
            FROM bot_requests br
            LEFT JOIN bot_request_env_vars bre ON br.id = bre.request_id
            WHERE br.id = ? AND br.dev_email = ?
            GROUP BY br.id
        `, [req.params.id, req.session.user.email]);

        if (!request[0]) {
            return res.status(404).json({ error: 'Bot request not found' });
        }

        const formattedRequest = {
            ...request[0],
            env_vars: request[0].env_vars ? request[0].env_vars.split('||').map(env => {
                const [name, description] = env.split(':');
                return { name, description };
            }) : []
        };

        res.json(formattedRequest);
    } catch (error) {
        console.error('Error fetching bot request:', error);
        res.status(500).json({ error: 'An error occurred while fetching the bot request' });
    }
});

router.put('/bot-request/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const { name, repoUrl, deploymentCost, websiteUrl, envVars } = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        
        const [botRequest] = await connection.query(
            'SELECT * FROM bot_requests WHERE id = ? AND dev_email = ?',
            [id, req.session.user.email]
        );

        if (!botRequest.length) {
            return res.status(404).json({ error: 'Bot request not found or unauthorized' });
        }

        
        if (repoUrl && repoUrl !== botRequest[0].repo_url) {
            const validation = await validateRepoOwnership(repoUrl, req.session.user.email);
            
            if (!validation.valid) {
                return res.status(validation.code).json({ 
                    error: 'Repository validation failed', 
                    message: validation.error 
                });
            }
        }

        
        await connection.query(
            'UPDATE bot_requests SET name = ?, repo_url = ?, deployment_cost = ?, website_url = ? WHERE id = ? AND dev_email = ?',
            [name, repoUrl, deploymentCost, websiteUrl, id, req.session.user.email]
        );

        
        await connection.query('DELETE FROM bot_request_env_vars WHERE request_id = ?', [id]);
        if (envVars && envVars.length > 0) {
            const envVarValues = envVars.map(envVar => [
                id, envVar.name, envVar.description, envVar.required ? 1 : 0
            ]);
            await connection.query(
                'INSERT INTO bot_request_env_vars (request_id, var_name, var_description, required) VALUES ?',
                [envVarValues]
            );
        }

        await connection.commit();
        res.json({ success: true, message: 'Bot request updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating bot request:', error);
        res.status(500).json({ error: 'An error occurred while updating the bot request' });
    } finally {
        connection.release();
    }
});

router.post('/bot/:id/update-from-repo', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    console.log("bot id:", id);
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        console.log("Entered try block");

        
        const [bot] = await connection.query(
            'SELECT repo_url FROM bots WHERE id = ? AND dev_email = ?',
            [id, req.session.user.email]
        );

        if (!bot.length) {
            return res.status(404).json({ error: 'Bot not found or unauthorized' });
        }

        const repoUrl = bot[0].repo_url;

        
        const validation = await validateRepoOwnership(repoUrl, req.session.user.email);
        if (!validation.valid) {
            return res.status(validation.code).json({ 
                error: 'Repository validation failed', 
                message: validation.error 
            });
        }

        const config = validation.config;
        console.log('Fetched config:', config);

        
        const botName = config['bot-name'];
        const websiteUrl = config['documentation-link'];

        
        const [updateResult] = await connection.query(
            'UPDATE bots SET name = ?, repo_url = ?, website_url = ? WHERE id = ? AND dev_email = ?',
            [botName, repoUrl, websiteUrl, id, req.session.user.email]
        );
        console.log('Update result:', updateResult);

        
        
        const [deleteResult] = await connection.query('DELETE FROM bot_env_vars WHERE bot_id = ?', [id]);
        console.log('Deleted env vars:', deleteResult.affectedRows);

        
        if (config.env) {
            const envVars = [];
            for (const [key, details] of Object.entries(config.env)) {
                envVars.push([
                    id,
                    key,
                    details.description,
                    details.required ? 1 : 0
                ]);
            }

            if (envVars.length > 0) {
                const [insertResult] = await connection.query(
                    'INSERT INTO bot_env_vars (bot_id, var_name, var_description, required) VALUES ?',
                    [envVars]
                );
                console.log('Inserted env vars:', insertResult.affectedRows);
            }
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Bot updated successfully with information from talkdrove.json'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating bot from repository:', error);
        res.status(500).json({
            error: 'An error occurred while updating the bot',
            details: error.message
        });
    } finally {
        connection.release();
    }
});

module.exports = router;