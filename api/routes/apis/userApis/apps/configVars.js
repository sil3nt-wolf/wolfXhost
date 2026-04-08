const express = require('express');
const axios = require('axios');
const router = express.Router();
const pool = require('../../../../database/sqlConnection');
const isLoggedIn = require('../../../../middlewares/isLoggedin');


const SENSITIVE_VARS = ['HEROKU_API_KEYY', 'HEROKU_APP_NAMEE'];


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


async function handleHerokuRequest(appName, updatedVars = null, method = 'get') {
    try {
        
        const { apiKey, herokuAppName } = await getAppDeploymentDetails(appName);
        
        if (!apiKey) {
            throw new Error('API key not found for this app');
        }
        
        console.log(`Using Heroku app name: ${herokuAppName} for request to: ${appName}`);
        
        const url = `https://api.heroku.com/apps/${herokuAppName}/config-vars`;
        
        const response = await axios({
            method: method,
            url: url,
            data: updatedVars,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/vnd.heroku+json; version=3',
                'Content-Type': 'application/json',
            },
        });
        
        return response.data;
    } catch (error) {
        console.error(`Error in Heroku API request for ${appName}:`, error);
        throw error;
    }
}


router.get('/api/config-vars/:appName', isLoggedIn, async (req, res) => {
    const appName = req.params.appName;

    try {
        const configVars = await handleHerokuRequest(appName);

        
        const filteredVars = Object.fromEntries(
            Object.entries(configVars).filter(([key]) => !SENSITIVE_VARS.includes(key))
        );

        res.json(filteredVars);
    } catch (error) {
        console.error('Error fetching config vars:', error);
        res.status(500).send(`Failed to fetch config vars: ${error.message}`);
    }
});


router.post('/api/config-vars/:appName', isLoggedIn, async (req, res) => {
    const appName = req.params.appName;
    const updatedVars = req.body;

    try {
        
        const currentVars = await handleHerokuRequest(appName);

        
        const sensitiveVars = {};
        SENSITIVE_VARS.forEach(key => {
            if (currentVars[key]) {
                sensitiveVars[key] = currentVars[key];
            }
        });

        
        const finalVars = {
            ...updatedVars,
            ...sensitiveVars
        };

        
        const response = await handleHerokuRequest(appName, finalVars, 'patch');

        
        const filteredResponse = Object.fromEntries(
            Object.entries(response).filter(([key]) => !SENSITIVE_VARS.includes(key))
        );

        res.json(filteredResponse);
    } catch (error) {
        console.error('Error updating config vars:', error);
        res.status(500).send(`Failed to update config vars: ${error.message}`);
    }
});


router.put('/api/config-vars/:appName', isLoggedIn, async (req, res) => {
    const appName = req.params.appName;
    const { key, value } = req.body;

    try {
        
        const currentVars = await handleHerokuRequest(appName);

        
        const updatedVars = {
            ...currentVars,
            [key]: value
        };

        
        const response = await handleHerokuRequest(appName, updatedVars, 'patch');

        
        const filteredResponse = Object.fromEntries(
            Object.entries(response).filter(([key]) => !SENSITIVE_VARS.includes(key))
        );

        res.json(filteredResponse);
    } catch (error) {
        console.error('Error adding config var:', error);
        res.status(500).send(`Failed to add config var: ${error.message}`);
    }
});


router.delete('/api/config-vars/:appName/:key', isLoggedIn, async (req, res) => {
    const appName = req.params.appName;
    const varKey = req.params.key;

    try {
        
        const currentVars = await handleHerokuRequest(appName);

        if (!(varKey in currentVars)) {
            return res.status(404).json({ message: `Variable ${varKey} does not exist` });
        }

        
        const updatedVars = {
            [varKey]: null,
        };

        const response = await handleHerokuRequest(appName, updatedVars, 'patch');

        if (response[varKey] === undefined) {
            return res.json({
                message: `Variable ${varKey} deleted successfully`,
                remainingVars: Object.fromEntries(
                    Object.entries(response).filter(([key]) => !SENSITIVE_VARS.includes(key))
                ),
            });
        } else {
            throw new Error(`Failed to delete variable ${varKey}`);
        }
    } catch (error) {
        console.error('Error deleting config var:', error);
        res.status(500).send(`Failed to delete config var: ${error.message}`);
    }
});

module.exports = router;