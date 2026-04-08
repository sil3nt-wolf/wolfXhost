const pool = require('../../../database/sqlConnection');


async function saveDeployment(userId, botId, appName, envValues, apiKey) {
    const connection = await pool.getConnection();
    let deployResult;
    try {
        await connection.beginTransaction();
        
        
        [deployResult] = await connection.query(
            'INSERT INTO deployed_apps (user_id, bot_id, app_name, heroku_app_name, status, heroku_api_key) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, botId, appName, appName, 'pending', apiKey]
        );
        await connection.commit();
        return deployResult.insertId;
    } catch (error) {
        await connection.rollback();
        
        if (deployResult?.insertId) {
            try {
                await connection.query(
                    'UPDATE deployed_apps SET status = ?, error_message = ? WHERE id = ?',
                    ['failed', error.message, deployResult.insertId]
                );
            } catch (updateError) {
                console.error('Failed to update deployment status to failed:', updateError);
            }
        }
        console.error('Error during saveDeployment:', error);
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = saveDeployment;