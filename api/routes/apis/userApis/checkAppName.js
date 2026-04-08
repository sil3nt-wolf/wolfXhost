const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const getRandomApiKey = require('../deploymentApis/getRandomApiKey');
const axios = require('axios');


function getUnavailabilityReason(existsInDb, isReserved, existsInHeroku) {
    if (existsInDb) return 'App name already taken';
    if (isReserved) return 'App name is reserved';
    if (existsInHeroku) return 'App name is already in use';
    return 'App name is unavailable';
}


router.get('/api/check-app-name', async (req, res) => {
    try {
        const { name } = req.query;

        
        if (!name || name.length < 3 || name.length > 30 || !/^[a-z0-9-]+$/.test(name)) {
            return res.status(400).json({
                isAvailable: false,
                message: 'Invalid name format: Must be 3-30 characters, lowercase letters, numbers, and hyphens only',
                details: {
                    existsInDatabase: false,
                    isReserved: false,
                    existsInHeroku: false
                }
            });
        }

        
        const [dbRows] = await pool.query(
            'SELECT id FROM deployed_apps WHERE app_name = ?',
            [name]
        );
        const existsInDb = dbRows.length > 0;

        
        const reservedNames = [
            'heroku-td', 'admin-td', 'api-td', 'dashboard-td', 'app-td', 
            'staging-td', 'production-td', 'test-td', 'testing-td', 
            'www-td', 'web-td', 'mail-td', 'email-td', 'beta-td', 'demo-td'
        ];
        const isReserved = reservedNames.includes(name);

        
        let existsInHeroku = false;
        const apiKey = await getRandomApiKey();

        if (!apiKey) {
            return res.status(500).json({
                isAvailable: false,
                message: 'No available API keys with capacity. Please try again later.',
                details: {
                    existsInDatabase: existsInDb,
                    isReserved: isReserved,
                    existsInHeroku: false
                }
            });
        }

        try {
            const herokuResponse = await axios.get(`https://api.heroku.com/apps/${name}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/vnd.heroku+json; version=3'
                }
            });

            
            existsInHeroku = true;
        } catch (herokuError) {
            
            if (herokuError.response && herokuError.response.status === 404) {
                existsInHeroku = false;
            } else {
                
                console.error('Error checking Heroku availability:', herokuError.message);
                return res.status(500).json({
                    isAvailable: false,
                    message: 'Error checking Heroku availability. Please try again.',
                    details: {
                        existsInDatabase: existsInDb,
                        isReserved: isReserved,
                        existsInHeroku: false
                    }
                });
            }
        }

        
        const isAvailable = !existsInDb && !isReserved && !existsInHeroku;

        
        const response = {
            isAvailable,
            message: isAvailable 
                ? 'App name is available' 
                : getUnavailabilityReason(existsInDb, isReserved, existsInHeroku),
            details: {
                existsInDatabase: existsInDb,
                isReserved,
                existsInHeroku
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Error checking app name:', error);
        res.status(500).json({
            isAvailable: false,
            message: 'Internal server error while checking app name',
            error: error.message,
            details: {
                existsInDatabase: false,
                isReserved: false,
                existsInHeroku: false
            }
        });
    }
});

module.exports = router;