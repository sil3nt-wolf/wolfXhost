const express = require('express')
const router = express.Router();
const pool = require('../../../database/sqlConnection')
const isAdmin = require('../../../middlewares/isAdmin')



router.get('/admin/users', isAdmin, async (req, res) => {
    try {
        
        const [users] = await pool.query(`
            SELECT 
                u.*, 
                (SELECT COUNT(*) 
                 FROM ip_account_tracking 
                 WHERE account_count > 0 
                   AND ip_address IN (
                       SELECT ip_address 
                       FROM user_devices 
                       WHERE user_id = u.id
                   )
                ) AS total_accounts_created
            FROM users u
            WHERE u.is_banned = 0
            ORDER BY u.id DESC
        `);

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'An error occurred while fetching users' });
    }
});

router.put('/admin/users/:id/coins', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { coins } = req.body;
    try {
        await pool.query('UPDATE users SET coins = ? WHERE id = ?', [coins, id]);
        res.json({ message: 'User coins updated successfully' });
    } catch (error) {
        console.error('Error updating user coins:', error);
        res.status(500).json({ error: 'An error occurred while updating user coins' });
    }
});


router.delete('/admin/users/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'An error occurred while deleting the user' });
    }
});



router.get('/admin/users', isAdmin, async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT 
                u.*,
                (SELECT COUNT(*) 
                 FROM ip_account_tracking 
                 WHERE ip_address IN (
                     SELECT DISTINCT ip_address 
                     FROM user_devices 
                     WHERE user_id = u.id
                 )) AS total_accounts_created,
                (SELECT GROUP_CONCAT(DISTINCT ip_address) 
                 FROM user_devices 
                 WHERE user_id = u.id) AS user_ip_addresses
            FROM users u
            WHERE u.is_banned = 0
            ORDER BY u.id DESC
        `);
        
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'An error occurred while fetching users' });
    }
});


router.get('/admin/banned-users', isAdmin, async (req, res) => {
    try {
        const [bannedUsers] = await pool.query(`
            SELECT 
                u.*,
                (SELECT COUNT(*) 
                 FROM ip_account_tracking 
                 WHERE ip_address IN (
                     SELECT DISTINCT ip_address 
                     FROM user_devices 
                     WHERE user_id = u.id
                 )) AS total_accounts_created,
                (SELECT GROUP_CONCAT(DISTINCT ip_address) 
                 FROM user_devices 
                 WHERE user_id = u.id) AS user_ip_addresses
            FROM users u
            WHERE u.is_banned = 1
            ORDER BY u.id DESC
        `);
        
        res.json(bannedUsers);
    } catch (error) {
        console.error('Error fetching banned users:', error);
        res.status(500).json({ error: 'An error occurred while fetching banned users' });
    }
});


router.get('/admin/ip-tracking', isAdmin, async (req, res) => {
    try {
        const [ipTracking] = await pool.query(`
            SELECT 
                ip_address, 
                account_count, 
                created_at, 
                updated_at, 
                last_signup,
                (SELECT GROUP_CONCAT(DISTINCT email) 
                 FROM users u
                 JOIN user_devices ud ON u.id = ud.user_id
                 WHERE ud.ip_address = ip_account_tracking.ip_address
                ) AS associated_emails
            FROM ip_account_tracking
            WHERE account_count > 0
            ORDER BY account_count DESC
        `);
        
        res.json(ipTracking);
    } catch (error) {
        console.error('Error fetching IP account tracking:', error);
        res.status(500).json({ error: 'An error occurred while fetching IP tracking details' });
    }
});


router.post('/admin/users/:id/ban', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE users SET is_banned = 1 WHERE id = ?', [id]);
        res.json({ message: 'User banned successfully' });
    } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).json({ error: 'An error occurred while banning the user' });
    }
});


router.post('/admin/users/:id/unban', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE users SET is_banned = 0 WHERE id = ?', [id]);
        res.json({ message: 'User unbanned successfully' });
    } catch (error) {
        console.error('Error unbanning user:', error);
        res.status(500).json({ error: 'An error occurred while unbanning the user' });
    }
});
module.exports = router;