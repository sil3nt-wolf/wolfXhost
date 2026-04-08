const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const isAdmin = require('../../../middlewares/isAdmin');



router.get('/admin/bots', isAdmin, async (req, res) => {
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
                b.*,
                GROUP_CONCAT(DISTINCT CONCAT(be.var_name, ':', be.var_description) SEPARATOR '||') as env_vars
            FROM bots b
            LEFT JOIN bot_env_vars be ON b.id = be.bot_id
            WHERE (
                b.name LIKE ? OR 
                b.dev_email LIKE ? OR 
                b.user_email LIKE ? OR
                b.website_url LIKE ?
            ) ${statusCondition}
            GROUP BY b.id
            ORDER BY b.${sort_by} ${sort_order}
            LIMIT ? OFFSET ?
        `;

        const searchPattern = `%${search}%`;
        const [bots] = await pool.query(query, [
            searchPattern,
            searchPattern,
            searchPattern,
            searchPattern,
            parseInt(limit),
            offset
        ]);

        
        const [totalRows] = await pool.query(`
            SELECT COUNT(DISTINCT b.id) as count
            FROM bots b
            WHERE (
                b.name LIKE ? OR 
                b.dev_email LIKE ? OR 
                b.user_email LIKE ? OR
                b.website_url LIKE ?
            ) ${statusCondition}
        `, [searchPattern, searchPattern, searchPattern, searchPattern]);

        const formattedBots = bots.map(bot => ({
            ...bot,
            env_vars: bot.env_vars ? bot.env_vars.split('||').map(env => {
                const [name, description] = env.split(':');
                return { name, description };
            }) : []
        }));

        res.json({
            bots: formattedBots,
            total: totalRows[0].count,
            pages: Math.ceil(totalRows[0].count / limit)
        });
    } catch (error) {
        console.error('Error fetching bots:', error);
        res.status(500).json({ error: 'An error occurred while fetching bots' });
    }
});


router.put('/admin/bot/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            repo_url,
            deployment_cost,
            website_url,
            developer_id,
            popularity_tier,
            is_suspended,
            dev_email,
            user_email,
            status
        } = req.body;

        await pool.query(`
            UPDATE bots 
            SET 
                name = ?,
                repo_url = ?,
                deployment_cost = ?,
                website_url = ?,
                developer_id = ?,
                popularity_tier = ?,
                is_suspended = ?,
                dev_email = ?,
                user_email = ?,
                status = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [
            name,
            repo_url,
            deployment_cost,
            website_url,
            developer_id,
            popularity_tier,
            is_suspended,
            dev_email,
            user_email,
            status,
            id
        ]);

        res.json({ message: 'Bot updated successfully' });
    } catch (error) {
        console.error('Error updating bot:', error);
        res.status(500).json({ error: 'An error occurred while updating the bot' });
    }
});


router.delete('/admin/bot/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.query('DELETE FROM bot_env_vars WHERE bot_id = ?', [id]);
        await pool.query('DELETE FROM bots WHERE id = ?', [id]);

        res.json({ message: 'Bot deleted successfully' });
    } catch (error) {
        console.error('Error deleting bot:', error);
        res.status(500).json({ error: 'An error occurred while deleting the bot' });
    }
});


router.post('/admin/bot/:id/toggle-status', isAdmin, async (req, res) => {
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