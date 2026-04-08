const express = require('express');
const router = express.Router();
const pool = require('../database/sqlConnection')

router.get('/api/check-app-name', async (req, res) => {
    try {
        const { name } = req.query;

        
        if (!name || name.length < 3 || name.length > 30 || !/^[a-z0-9-]+$/.test(name)) {
            return res.json({
                exists: false,
                reserved: false,
                error: 'Invalid name format'
            });
        }

        
        const [rows] = await pool.query(
            'SELECT id FROM deployed_apps WHERE app_name = ?',
            [name]
        );

        
        const reservedNames = [
            'heroku-td', 'admin-td', 'api-td', 'dashboard-td', 'app-td', 'staging-td', 'production-td',
            'test-td', 'testing-td', 'www-td', 'web-td', 'mail-td', 'email-td', 'beta-td', 'demo-td'
        ];

        const exists = rows.length > 0;
        const reserved = reservedNames.includes(name);

        res.json({
            exists,
            reserved,
            error: null
        });

    } catch (error) {
        console.error('Error checking app name:', error);
        res.status(500).json({
            error: 'Internal server error',
            exists: false,
            reserved: false
        });
    }
});