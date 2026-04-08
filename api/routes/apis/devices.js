const express = require('express');
const router = express.Router();
const pool = require('../../database/sqlConnection')
const isLoggedIn  = require('../../middlewares/isLoggedin');


router.get('/api/devices', isLoggedIn, async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        const [devices] = await pool.query(
            'SELECT * FROM user_devices WHERE user_id = ? ORDER BY last_used DESC',
            [req.session.user.id]
        );
    
        res.json({
            success: true,
            devices,
            currentDeviceId: req.session.user.deviceId
        });
    } catch (error) {
        console.error('Error fetching devices:', error);
        res.status(500).json({ error: 'Error fetching devices' });
    }
    });
    
    
router.post('/api/devices/remove', isLoggedIn, async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { deviceId } = req.body;
    
    try {
        
        if (deviceId === req.session.user.deviceId) {
            return res.status(400).json({ error: 'Cannot remove current device' });
        }
    
        
        const [devices] = await pool.query(
            'SELECT * FROM user_devices WHERE id = ? AND user_id = ?',
            [deviceId, req.session.user.id]
        );
    
        if (devices.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }
    
        
        await pool.query('DELETE FROM user_devices WHERE id = ?', [deviceId]);
    
        res.json({ success: true, message: 'Device removed successfully' });
    } catch (error) {
        console.error('Error removing device:', error);
        res.status(500).json({ error: 'Error removing device' });
    }
    });
    module.exports = router