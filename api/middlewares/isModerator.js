
const pool = require('../database/sqlConnection')
async function isModerator(req, res, next) {

    try {
    const [moderator] = await pool.query(
        'SELECT m.* FROM moderators m WHERE m.user_id = ? AND m.status = "active"',
        [req.session.user.id]
    );
    
    if (moderator.length === 0) {
        return res.status(403).json({ error: 'Not authorized as moderator' });
    }
    
    req.moderatorId = moderator[0].id;
    next();
    } catch (error) {
    res.status(500).json({ error: 'Error checking moderator status' });
    }
    }
    
    module.exports = isModerator;