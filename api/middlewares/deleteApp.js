const pool = require('../database/sqlConnection')
const { performance } = require('perf_hooks');
const axios = require('axios');

async function deleteApp(appName) {
    const startTime = performance.now();
    let connection;
    try {
        connection = await pool.getConnection();

        
        const [deploymentResults] = await connection.query(`
            SELECT id, user_id FROM deployed_apps 
            WHERE heroku_app_name = ? OR app_name = ?
        `, [appName, appName]);

        
        if (deploymentResults.length === 0) {
            connection.release();
            return { success: true, message: `App ${appName} not found` };
        }

        const { id: deploymentId, user_id } = deploymentResults[0];

        
        const [apiKeys] = await connection.query(
            'SELECT api_key FROM heroku_api_keys WHERE is_active = true ORDER BY RAND()'
        );

        let herokuDeleted = false;
        let deletionError = null;

        
        for (const { api_key } of apiKeys) {
            console.log("Hii I am log from function deleteApp and I am trying to delete this app", appName)

            try {
                const response = await axios.delete(`https://api.heroku.com/apps/${appName}`, {
                    headers: {
                        'Authorization': `Bearer ${api_key}`,
                        'Accept': 'application/vnd.heroku+json; version=3'
                    },
                    timeout: 10000  
                });
                console.log("Hii I am log from function deleteApp and I am trying to delete this app", appName)

                if (response.status === 200 || response.status === 204) {
                    herokuDeleted = true;
                    break;
                }
            } catch (error) {
                deletionError = error;
                console.error(`Heroku deletion failed with key ${api_key.slice(0, 5)}:`, error.message);
                console.log("Hii I am log from function deleteApp and I am trying to delete this app", appName)

            }
        }

        
        await connection.beginTransaction();


        
        await connection.query('DELETE FROM deployed_apps WHERE id = ?', [deploymentId]);

        await connection.commit();
        connection.release();

        const endTime = performance.now();
        console.log(`App ${appName} deletion process completed in ${(endTime - startTime).toFixed(2)}ms`);

        return {
            success: true,
            message: herokuDeleted 
                ? `App ${appName} fully deleted` 
                : `App ${appName} deleted from database, Heroku deletion failed`,
            herokuDeleted
        };

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackError) {
                console.error('Rollback error:', rollbackError);
            }
        }

        console.error('Deletion error:', error);
        return {
            success: false,
            message: `Deletion failed: ${error.message}`
        };
    }
}

module.exports = deleteApp;