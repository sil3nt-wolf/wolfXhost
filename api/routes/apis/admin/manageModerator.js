const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const isAdmin = require('../../../middlewares/isAdmin');


router.get('/api/admin/moderators', isAdmin, async (req, res) => {
    try {
        const [moderators] = await pool.query(`
            SELECT m.*, u.email, u.username 
            FROM moderators m 
            JOIN users u ON m.user_id = u.id 
            ORDER BY m.created_at DESC
        `);
        
        res.json(moderators);
    } catch (error) {
        console.error('Error fetching moderators:', error);
        res.status(500).json({ error: 'Failed to fetch moderators' });
    }
});


router.post('/api/admin/moderator', isAdmin, async (req, res) => {
    try {
        const { email, status } = req.body;

        
        const [user] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        
        const [existing] = await pool.query(
            'SELECT id FROM moderators WHERE user_id = ?', 
            [user[0].id]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User is already a moderator' });
        }

        
        await pool.query(
            'INSERT INTO moderators (user_id, status) VALUES (?, ?)',
            [user[0].id, status]
        );

        res.json({ message: 'Moderator added successfully' });
    } catch (error) {
        console.error('Error adding moderator:', error);
        res.status(500).json({ error: 'Failed to add moderator' });
    }
});


router.put('/api/admin/moderator/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await pool.query(
            'UPDATE moderators SET status = ? WHERE id = ?',
            [status, id]
        );

        res.json({ message: 'Moderator updated successfully' });
    } catch (error) {
        console.error('Error updating moderator:', error);
        res.status(500).json({ error: 'Failed to update moderator' });
    }
});


router.delete('/api/admin/moderator/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM moderators WHERE id = ?', [id]);
        res.json({ message: 'Moderator deleted successfully' });
    } catch (error) {
        console.error('Error deleting moderator:', error);
        res.status(500).json({ error: 'Failed to delete moderator' });
    }
});

module.exports = router;