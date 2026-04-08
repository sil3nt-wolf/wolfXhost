const express = require('express')
const router = express.Router();
const pool = require('../../../database/sqlConnection')
const isAdmin = require('../../../middlewares/isAdmin')

router.post('/admin/bot/:id/toggle-status', isAdmin,  async (req, res) => {
    const { id } = req.params;
    const { is_suspended } = req.body;
    
    try {
    await pool.query(
        'UPDATE bots SET is_suspended = ? WHERE id = ?',
        [is_suspended, id]
    );
    
    res.json({ 
        success: true, 
        message: `Bot ${is_suspended ? 'suspended' : 'activated'} successfully` 
    });
    } catch (error) {
    console.error('Error toggling bot status:', error);
    res.status(500).json({ 
        error: 'An error occurred while updating bot status' 
    });
    }
    });

    module.exports = router;