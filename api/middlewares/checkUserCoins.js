const pool = require('../database/sqlConnection')
const checkUserCoins = async (req, res, next) => {
    try {
        const [userRows] = await pool.query(
            'SELECT coins FROM users WHERE email = ?',
            [req.session.user.phoneNumber]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        req.userCoins = userRows[0].coins;
        next();
    } catch (error) {
        console.error('Error checking user coins:', error);
        res.status(500).json({ error: 'Failed to check user coins' });
    }
};
module.exports = checkUserCoins;