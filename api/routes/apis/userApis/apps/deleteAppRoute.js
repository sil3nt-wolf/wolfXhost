const deleteApp = require('../../../../middlewares/deleteApp');
const express = require('express');
const router = express.Router();
const pool = require('../../../../database/sqlConnection');
const isLoggedIn = require('../../../../middlewares/isLoggedin');


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


router.delete('/delete-app/:appName', isLoggedIn, async (req, res) => {
    const { appName } = req.params;
    console.log("executing deleteAppRoute.js in userApis/apps");
    
    try {
        
        const { apiKey, herokuAppName } = await getAppDeploymentDetails(appName);
        console.log(`Using Heroku app name: ${herokuAppName} for deleting app requested as: ${appName}`);
        
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 30000); 
        });
        
        
        const deletePromise = deleteApp(herokuAppName, apiKey);
        console.log("executing deleteApp function and app name is", herokuAppName);
        
        const result = await Promise.race([deletePromise, timeoutPromise]);
        
        if (result.success) {
            
            await pool.query(
                'UPDATE deployed_apps SET status = ? WHERE heroku_app_name = ?',
                ['deleted', herokuAppName]
            );
            
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('Error in delete app route:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            details: error.message
        });
    }
});

module.exports = router;