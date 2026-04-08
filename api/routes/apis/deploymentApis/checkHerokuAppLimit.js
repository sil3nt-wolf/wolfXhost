const fetch = require('node-fetch')

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
            hasCapacity: apps.length < 98
        };
    } catch (error) {
        console.error('Error checking Heroku app limit:', error);
        return {
            isValid: false,
            error: error.message
        };
    }
    }
    
module.exports = checkHerokuAppLimit;