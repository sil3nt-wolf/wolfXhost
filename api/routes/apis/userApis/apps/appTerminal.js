const express = require('express');
const axios = require('axios');
const pool = require('../../../../database/sqlConnection');
const isLoggedIn = require('../../../../middlewares/isLoggedin');
const router = express.Router();


async function getAppDeploymentDetails(appName) {
    const connection = await pool.getConnection();
    try {
        
        let [appData] = await connection.query(
            'SELECT heroku_api_key, heroku_app_name FROM deployed_apps WHERE (app_name = ? OR heroku_app_name = ?) AND status = "active" LIMIT 1',
            [appName, appName]
        );
        
        
        if (!appData || appData.length === 0) {
            const herokuAppName = `${appName}-td`;
            [appData] = await connection.query(
                'SELECT heroku_api_key, heroku_app_name FROM deployed_apps WHERE heroku_app_name = ? AND status = "active" LIMIT 1',
                [herokuAppName]
            );
        }
        
        
        if (!appData || appData.length === 0) {
            [appData] = await connection.query(
                'SELECT heroku_api_key, heroku_app_name FROM deployed_apps WHERE (app_name LIKE ? OR heroku_app_name LIKE ?) AND status = "active" LIMIT 1',
                [`%${appName}%`, `%${appName}%`]
            );
        }
        
        if (!appData || appData.length === 0) {
            throw new Error(`No active deployment found for app: ${appName}`);
        }
        
        return {
            apiKey: appData[0].heroku_api_key,
            herokuAppName: appData[0].heroku_app_name
        };
    } finally {
        connection.release();
    }
}


async function executeNpmCommandOnHeroku(apiKey, herokuAppName, command) {
    try {
        console.log(`Executing command on Heroku app: ${herokuAppName} with command: ${command}`);
        
        
        const response = await axios.post(
            `https://api.heroku.com/apps/${herokuAppName}/dynos`,
            {
                command, 
                type: 'run', 
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    Accept: 'application/vnd.heroku+json; version=3',
                    'Content-Type': 'application/json'
                },
            }
        );
        
        return response.data.id;
    } catch (error) {
        console.error('Error executing npm command on Heroku:', error.response?.data || error.message);
        throw new Error(`Failed to execute npm command on Heroku: ${error.response?.data?.message || error.message}`);
    }
}


router.post('/api/npm-command', isLoggedIn, async (req, res) => {
    const { app, command } = req.body;
    
    if (!app || !command) {
        return res.status(400).json({
            success: false,
            error: 'App name and command are required'
        });
    }
    
    try {
        
        const { apiKey, herokuAppName } = await getAppDeploymentDetails(app);
        console.log(`Using Heroku app name: ${herokuAppName} for app requested as: ${app}`);
        
        
        const dynoId = await executeNpmCommandOnHeroku(apiKey, herokuAppName, command);
        
        res.json({
            success: true,
            message: `Command executed on ${herokuAppName}. See the logs for more info, here's dyno id:\n ${dynoId}`,
            herokuAppName,
            dynoId
        });
    } catch (error) {
        console.error('Error in npm command route:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to execute npm command'
        });
    }
});

module.exports = router;