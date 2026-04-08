const express = require('express')
const router = express.Router();
const pool = require('../../../database/sqlConnection')
const isAdmin = require('../../../middlewares/isAdmin')




router.get('/admin/appeals', isAdmin, async (req, res) => {
    try {
        const [appeals] = await pool.query(`
            SELECT 
                ua.*,
                u.email as user_email,
                u.username as user_username,
                admin.username as admin_username
            FROM user_appeals ua
            LEFT JOIN users u ON ua.user_id = u.id
            LEFT JOIN users admin ON ua.reviewed_by = admin.id
            ORDER BY ua.created_at DESC
        `);

        res.json(appeals);
    } catch (error) {
        console.error('Error fetching appeals:', error);
        res.status(500).json({ message: 'Error fetching appeals' });
    }
});


router.patch('/admin/appeals/:id', isAdmin, async (req, res) => {
    try {
        const { status, adminResponse } = req.body;
        const appealId = req.params.id;
        const adminId = req.session.user.id;

        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            
            await connection.query(
                `UPDATE user_appeals 
                 SET status = ?, 
                     admin_response = ?,
                     reviewed_by = ?,
                     reviewed_at = NOW()
                 WHERE id = ?`,
                [status, adminResponse, adminId, appealId]
            );

            
            if (status === 'approved') {
                const [appeal] = await connection.query(
                    'SELECT user_id FROM user_appeals WHERE id = ?',
                    [appealId]
                );

                if (appeal.length > 0) {
                    await connection.query(
                        'UPDATE users SET is_banned = 0 WHERE id = ?',
                        [appeal[0].user_id]
                    );
                }
            }

            await connection.commit();

            res.json({
                message: `Appeal ${status}`,
                appealId: appealId
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error updating appeal:', error);
        res.status(500).json({ message: 'Error updating appeal' });
    }
});

module.exports = router;