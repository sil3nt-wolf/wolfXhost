const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const transporter = require('../../../database/emailConnection');
const isAdmin = require('../../../middlewares/isAdmin');


router.get('/admin/bots', isAdmin, async (req, res) => {
    try {
        const [bots] = await pool.query(`
            SELECT b.*, 
                GROUP_CONCAT(DISTINCT CONCAT(be.var_name, ':', be.var_description) SEPARATOR '||') as env_vars
            FROM bots b
            LEFT JOIN bot_env_vars be ON b.id = be.bot_id
            GROUP BY b.id
            ORDER BY b.created_at DESC
        `);
    
        const formattedBots = bots.map(bot => ({
            ...bot,
            env_vars: bot.env_vars ? bot.env_vars.split('||').map(env => {
                const [name, description] = env.split(':');
                return { name, description };
            }) : []
        }));
    
        res.json(formattedBots);
    } catch (error) {
        console.error('Error fetching bots:', error);
        res.status(500).json({ error: 'An error occurred while fetching bots' });
    }
});


router.get('/admin/bot-requests', isAdmin, async (req, res) => {
    try {
        const [requests] = await pool.query(`
            SELECT br.*, 
                GROUP_CONCAT(DISTINCT CONCAT(bre.var_name, ':', bre.var_description) SEPARATOR '||') as env_vars,
                u.name as user_name
            FROM bot_requests br
            LEFT JOIN bot_request_env_vars bre ON br.id = bre.request_id
            LEFT JOIN users u ON br.user_email = u.email
            GROUP BY br.id
            ORDER BY br.created_at DESC
        `);

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


async function sendBotStatusEmail(devEmail, botName, status, botId = null) {
    const subject = status === 'approved' 
        ? `Your Bot Request for "${botName}" Has Been Approved`
        : `Your Bot Request for "${botName}" Has Been Rejected`;
    
    const dashboardUrl = 'https://host.talkdrove.com/dashboard/my-bots';
    const deploymentUrl = botId 
        ? `https://host.talkdrove.com/dashboard/select-bot/prepare-deployment?botId=${botId}`
        : null;
    
    const htmlContent = status === 'approved' 
        ? `
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
                                    <td style="padding: 30px 40px 20px; text-align: left; background-color: #4CAF50; border-radius: 8px 8px 0 0;">
                                        <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 24px; color: white;">
                                            Bot Request Approved!
                                        </h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px 40px;">
                                        <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #555555;">
                                            Congratulations! Your bot request for <strong>${botName}</strong> has been approved by our admin team.
                                        </p>
                                        
                                        <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #555555;">
                                            You can now proceed to prepare the deployment of your bot using the link below:
                                        </p>
                                        
                                        <div style="text-align: center; margin: 30px 0;">
                                            <a href="${deploymentUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; border-radius: 4px;">
                                                Prepare Bot Deployment
                                            </a>
                                        </div>
                                        
                                        <p style="margin: 20px 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #555555;">
                                            You can also view all your bots and manage their settings from your dashboard:
                                        </p>
                                        
                                        <div style="text-align: center; margin: 20px 0;">
                                            <a href="${dashboardUrl}" style="display: inline-block; padding: 10px 20px; background-color: #607D8B; color: white; text-decoration: none; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; border-radius: 4px;">
                                                Go to My Bots Dashboard
                                            </a>
                                        </div>
                                        
                                        <p style="margin: 30px 0 10px; font-family: Arial, sans-serif; font-size: 14px; color: #666666;">
                                            Thank you for choosing TalkDrove for your bot hosting needs!
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `
        : `
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
                                    <td style="padding: 30px 40px 20px; text-align: left; background-color: #F44336; border-radius: 8px 8px 0 0;">
                                        <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 24px; color: white;">
                                            Bot Request Status Update
                                        </h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px 40px;">
                                        <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #555555;">
                                            We regret to inform you that your bot request for <strong>${botName}</strong> has been rejected by our admin team.
                                        </p>
                                        
                                        <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #555555;">
                                            This could be due to various reasons including compliance issues, technical limitations, or incomplete information. You may submit a new request with revised details.
                                        </p>
                                        
                                        <div style="text-align: center; margin: 30px 0;">
                                            <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #607D8B; color: white; text-decoration: none; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; border-radius: 4px;">
                                                Go to My Dashboard
                                            </a>
                                        </div>
                                        
                                        <p style="margin: 30px 0 10px; font-family: Arial, sans-serif; font-size: 14px; color: #666666;">
                                            If you have any questions or need assistance, please contact our support team.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

    try {
        await transporter.sendMail({
            from: '"TalkDrove Bot Service" <msg@talkdrove.com>',
            to: devEmail,
            subject: subject,
            html: htmlContent
        });
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
}

router.post('/admin/bot-requests/:id/handle', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        
        const [request] = await connection.query(
            'SELECT * FROM bot_requests WHERE id = ?',
            [id]
        );

        if (request.length === 0) {
            return res.status(404).json({ error: 'Bot request not found' });
        }

        
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status provided' });
        }

        let botId = null;

        if (status === 'approved') {
            
            const [result] = await connection.query(
                'INSERT INTO bots (name, repo_url, deployment_cost, dev_email, website_url) VALUES (?, ?, ?, ?, ?)',
                [
                    request[0].name,
                    request[0].repo_url,
                    request[0].deployment_cost,
                    request[0].dev_email,
                    request[0].website_url
                ]
            );

            botId = result.insertId;

            
            const [envVars] = await connection.query(
                'SELECT * FROM bot_request_env_vars WHERE request_id = ?',
                [id]
            );

            if (envVars.length > 0) {
                const envVarValues = envVars.map(envVar => [
                    botId,
                    envVar.var_name,
                    envVar.var_description,
                    envVar.required 
                ]);

                await connection.query(
                    'INSERT INTO bot_env_vars (bot_id, var_name, var_description, required) VALUES ?',
                    [envVarValues]
                );
            }

            
            await connection.query(
                'DELETE FROM bot_requests WHERE id = ?',
                [id]
            );

            
            await connection.query(
                'DELETE FROM bot_request_env_vars WHERE request_id = ?',
                [id]
            );
        } else if (status === 'rejected') {
            await connection.query(
                'UPDATE bot_requests SET status = ? WHERE id = ?',
                [status, id]
            );
        }

        
        const emailSent = await sendBotStatusEmail(
            request[0].dev_email, 
            request[0].name, 
            status,
            botId
        );

        await connection.commit();
        res.json({
            success: true,
            message: `Bot request ${status}`,
            deploymentCost: request[0].deployment_cost,
            emailSent: emailSent
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error handling bot request:', error);
        res.status(500).json({ 
            error: 'An error occurred while handling the bot request',
            details: error.message 
        });
    } finally {
        connection.release();
    }
});


router.post('/admin/bot/:id/toggle-status', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { is_suspended } = req.body;
    
    try {
        
        const [bot] = await pool.query(
            'SELECT name, dev_email FROM bots WHERE id = ?',
            [id]
        );
        
        if (bot.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        
        
        await pool.query(
            'UPDATE bots SET is_suspended = ? WHERE id = ?',
            [is_suspended, id]
        );
        
        
        const emailSubject = is_suspended ? 
            `Your Bot "${bot[0].name}" Has Been Suspended` : 
            `Your Bot "${bot[0].name}" Has Been Activated`;
            
        const htmlContent = is_suspended ? 
            `
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
                                    <td style="padding: 30px 40px 20px; text-align: left; background-color: #FF9800; border-radius: 8px 8px 0 0;">
                                        <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 24px; color: white;">
                                            Bot Suspended
                                        </h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px 40px;">
                                        <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #555555;">
                                            Your bot <strong>${bot[0].name}</strong> has been temporarily suspended. This may be due to compliance issues, technical problems, or policy violations.
                                        </p>
                                        
                                        <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #555555;">
                                            Please check your bot's configuration and any recent changes you may have made. You can view your bot's status and settings from your dashboard.
                                        </p>
                                        
                                        <div style="text-align: center; margin: 30px 0;">
                                            <a href="https://host.talkdrove.com/dashboard/my-bots" style="display: inline-block; padding: 12px 24px; background-color: #607D8B; color: white; text-decoration: none; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; border-radius: 4px;">
                                                Go to My Bots Dashboard
                                            </a>
                                        </div>
                                        
                                        <p style="margin: 30px 0 10px; font-family: Arial, sans-serif; font-size: 14px; color: #666666;">
                                            If you have any questions or need assistance, please contact our support team.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            ` 
            : 
            `
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
                                    <td style="padding: 30px 40px 20px; text-align: left; background-color: #4CAF50; border-radius: 8px 8px 0 0;">
                                        <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 24px; color: white;">
                                            Bot Activated
                                        </h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px 40px;">
                                        <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #555555;">
                                            Good news! Your bot <strong>${bot[0].name}</strong> has been activated and is now live on our platform.
                                        </p>
                                        
                                        <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #555555;">
                                            You can now manage your bot's settings and monitor its performance from your dashboard.
                                        </p>
                                        
                                        <div style="text-align: center; margin: 30px 0;">
                                            <a href="https://host.talkdrove.com/dashboard/my-bots" style="display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; border-radius: 4px;">
                                                Go to My Bots Dashboard
                                            </a>
                                        </div>
                                        
                                        <p style="margin: 30px 0 10px; font-family: Arial, sans-serif; font-size: 14px; color: #666666;">
                                            Thank you for choosing TalkDrove for your bot hosting needs!
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            `;
        
        try {
            await transporter.sendMail({
                from: '"TalkDrove Bot Service" <msg@talkdrove.com>',
                to: bot[0].dev_email,
                subject: emailSubject,
                html: htmlContent
            });
            
            res.json({ 
                success: true, 
                message: `Bot ${is_suspended ? 'suspended' : 'activated'} successfully`,
                emailSent: true
            });
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            res.json({ 
                success: true, 
                message: `Bot ${is_suspended ? 'suspended' : 'activated'} successfully, but failed to send email notification`,
                emailSent: false
            });
        }
    } catch (error) {
        console.error('Error toggling bot status:', error);
        res.status(500).json({ error: 'An error occurred while updating bot status' });
    }
});

module.exports = router;