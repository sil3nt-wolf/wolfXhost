
const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const isModerator = require('../../../middlewares/isModerator');

router.get('/api/moderator/bots', isModerator, async (req, res) => {
    try {
        const { 
            search = '', 
            status = 'all', 
            page = 1, 
            limit = 10,
            sort_by = 'created_at',
            sort_order = 'desc'
        } = req.query;

        const offset = (page - 1) * limit;
        
        let statusCondition = '';
        if (status !== 'all') {
            statusCondition = status === 'active' ? 
                'AND b.is_suspended = 0' : 
                'AND b.is_suspended = 1';
        }

        const query = `
            SELECT 
                b.id, b.name, b.repo_url, b.website_url, 
                b.dev_email, b.is_suspended, b.deployment_cost,
                b.created_at, b.updated_at
            FROM bots b
            WHERE (
                b.name LIKE ? OR 
                b.dev_email LIKE ? OR 
                b.website_url LIKE ?
            ) ${statusCondition}
            ORDER BY b.${sort_by} ${sort_order}
            LIMIT ? OFFSET ?
        `;

        const searchPattern = `%${search}%`;
        const [bots] = await pool.query(query, [
            searchPattern,
            searchPattern,
            searchPattern,
            parseInt(limit),
            offset
        ]);

        const [totalRows] = await pool.query(`
            SELECT COUNT(*) as count
            FROM bots b
            WHERE (
                b.name LIKE ? OR 
                b.dev_email LIKE ? OR 
                b.website_url LIKE ?
            ) ${statusCondition}
        `, [searchPattern, searchPattern, searchPattern]);

        res.json({
            bots,
            total: totalRows[0].count,
            pages: Math.ceil(totalRows[0].count / limit)
        });
    } catch (error) {
        console.error('Error fetching bots:', error);
        res.status(500).json({ error: 'An error occurred while fetching bots' });
    }
});


router.put('/api/moderator/bot/:id', isModerator, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, website_url, repo_url, is_suspended } = req.body;

        await pool.query(`
            UPDATE bots 
            SET 
                name = ?,
                website_url = ?,
                repo_url = ?,
                is_suspended = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [name, website_url, repo_url, is_suspended, id]);

        res.json({ message: 'Bot updated successfully' });
    } catch (error) {
        console.error('Error updating bot:', error);
        res.status(500).json({ error: 'An error occurred while updating the bot' });
    }
});


router.post('/api/moderator/bot/:id/toggle-status', isModerator, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_suspended } = req.body;

        await pool.query('UPDATE bots SET is_suspended = ?, updated_at = NOW() WHERE id = ?', 
            [is_suspended, id]);

        res.json({ message: `Bot ${is_suspended ? 'suspended' : 'activated'} successfully` });
    } catch (error) {
        console.error('Error toggling bot status:', error);
        res.status(500).json({ error: 'An error occurred while updating bot status' });
    }
});

module.exports = router;