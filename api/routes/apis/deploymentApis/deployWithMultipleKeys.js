const getBotDetails = require('./getBotDetails');
const getRandomApiKey = require('./getRandomApiKey');
const saveDeployment = require('./saveDeployment');
const pool = require('../../../database/sqlConnection');
const fetch = require('node-fetch');

async function checkHerokuAppLimit(apiKey) {
    try {
        const response = await fetch('https://api.heroku.com/apps', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/vnd.heroku+json; version=3',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                return {
                    isValid: false,
                    error: 'API key is invalid or account is banned'
                };
            }
            throw new Error(`Failed to fetch apps: ${response.statusText}`);
        }

        const apps = await response.json();
        return {
            isValid: true,
            appsCount: apps.length,
            hasCapacity: apps.length < 99
        };
    } catch (error) {
        console.error('Error checking Heroku app limit:', error);
        return {
            isValid: false,
            error: error.message
        };
    }
}

async function updateBotStatistics(connection, botId, deploymentSuccess = true) {
    await connection.query(`
        UPDATE bots 
        SET 
            total_deployments = COALESCE(total_deployments, 0) + ?,
            popularity_tier = CASE
                WHEN (COALESCE(total_deployments, 0) + ?) >= 100 THEN 'popular'
                WHEN (COALESCE(total_deployments, 0) + ?) >= 50 THEN 'rising'
                ELSE 'standard'
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [deploymentSuccess ? 1 : 0, deploymentSuccess ? 1 : 0, deploymentSuccess ? 1 : 0, botId]);
}

async function updateApiKeyStatistics(connection, apiKey, status) {
    if (status.isValid) {
        await connection.query(`
            UPDATE heroku_api_keys 
            SET 
                apps_count = ?,
                last_checked = CURRENT_TIMESTAMP,
                successful_deployments = COALESCE(successful_deployments, 0) + 1,
                failed_attempts = 0,
                last_used = CURRENT_TIMESTAMP
            WHERE api_key = ?
        `, [status.appsCount, apiKey]);
    }
}
async function deployWithMultipleKeys(botId, envValues, userId, customAppName) {
    const { bot } = await getBotDetails(botId);
    const connection = await pool.getConnection();

    try {
        const apiKey = await getRandomApiKey(connection);
        if (!apiKey) {
            throw new Error('No servers available');
        }

        await connection.beginTransaction();

        
        const deploymentId = await saveDeployment(userId, botId, customAppName, envValues, apiKey);

        try {
            const createAppResponse = await fetch('https://api.heroku.com/apps', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/vnd.heroku+json; version=3'
                },
                body: JSON.stringify({ name: customAppName })
            });

            if (!createAppResponse.ok) {
                throw new Error('App creation failed');
            }

            const appData = await createAppResponse.json();

            const configResponse = await fetch(`https://api.heroku.com/apps/${customAppName}/config-vars`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/vnd.heroku+json; version=3'
                },
                body: JSON.stringify(envValues)
            });

            if (!configResponse.ok) {
                throw new Error('Failed to set environment variables');
            }

            const buildResponse = await fetch(`https://api.heroku.com/apps/${customAppName}/builds`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/vnd.heroku+json; version=3'
                },
                body: JSON.stringify({
                    source_blob: {
                        url: `https://github.com/${bot.repo_url}/tarball/main`
                    }
                })
            });

            if (!buildResponse.ok) {
                throw new Error('Build initiation failed');
            }

            await connection.query(
                'UPDATE deployed_apps SET status = ? WHERE id = ?',
                ['active', deploymentId]
            );

            const status = await checkHerokuAppLimit(apiKey);

            await Promise.all([
                updateBotStatistics(connection, botId, true),
                updateApiKeyStatistics(connection, apiKey, status)
            ]);

            await connection.commit();

            return {
                success: true,
                appData,
                deploymentId,
                appUrl: `https://${customAppName}.herokuapp.com`
            };

        } catch (error) {
            await connection.rollback();

            await connection.query(
                'UPDATE deployed_apps SET status = ?, error_message = ? WHERE id = ?',
                ['failed', error.message, deploymentId]
            );

            await connection.query(`
                UPDATE heroku_api_keys 
                SET failed_attempts = COALESCE(failed_attempts, 0) + 1,
                    last_failed = CURRENT_TIMESTAMP
                WHERE api_key = ?
            `, [apiKey]);

            try {
                await fetch(`https://api.heroku.com/apps/${customAppName}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Accept': 'application/vnd.heroku+json; version=3'
                    }
                });
            } catch (deleteError) {
                console.error('Cleanup failed:', deleteError);
            }

            throw error;
        }
    } finally {
        connection.release();
    }
}

module.exports = deployWithMultipleKeys;