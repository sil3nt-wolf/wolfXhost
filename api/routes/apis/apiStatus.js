
const fetch = require('node-fetch');
const pool = require('../../database/sqlConnection')


async function checkApiKeyValidity(apiKey) {
    try {
        const response = await fetch('https://api.heroku.com/account', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/vnd.heroku+json; version=3'
            },
            timeout: 10000 
        });

        
        if (response.status === 401 || response.status === 403) {
            return false; 
        }

        return response.ok;
    } catch (error) {
        console.error('Error checking API key:', error);
        
        return error.name === 'TimeoutError' ? true : false;
    }
}
async function updateApiKeyStatus(apiKey, isActive, reason) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        
        const [keyData] = await connection.query(
            'SELECT failed_attempts, last_checked FROM heroku_api_keys WHERE api_key = ? FOR UPDATE',
            [apiKey]
        );

        if (keyData.length === 0) {
            await connection.rollback();
            return;
        }

        
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const lastChecked = new Date(keyData[0].last_checked);

        if (!isActive && lastChecked > fiveMinutesAgo) {
            
            const isStillValid = await checkApiKeyValidity(apiKey);
            if (isStillValid) {
                await connection.rollback();
                return;
            }
        }

        await connection.query(`
            UPDATE heroku_api_keys 
            SET 
                is_active = ?,
                last_checked = CURRENT_TIMESTAMP,
                failed_attempts = IF(? = false, failed_attempts + 1, 0),
                last_error = ?
            WHERE api_key = ?
        `, [isActive, isActive, reason || null, apiKey]);

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        console.error('Error updating API key status:', error);
    } finally {
        connection.release();
    }
}
module.exports = { checkApiKeyValidity, updateApiKeyStatus };