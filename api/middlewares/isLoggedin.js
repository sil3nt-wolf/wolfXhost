const pool = require('../database/sqlConnection');

async function isLoggedIn(req, res, next) {
    
    if (req.session.user) {
        try {
            
            const [rows] = await pool.query('SELECT is_banned FROM users WHERE id = ?', [req.session.user.id]);

            
            

            if (rows.length > 0) {
                
                const user = rows[0];  
                

                
                req.session.user.is_banned = user.is_banned;

                
                if (user.is_banned === 1) {
                    return res.redirect('/banned');
                }

                
                return next();
            } else {
                
                req.session.destroy(() => {
                    return res.redirect('/auth/login');
                });
            }
        } catch (error) {
            console.error('Error checking ban status:', error);
            return res.redirect('/auth/login');
        }
    } else {
        
        return res.redirect('/auth/login');
    }
}

module.exports = isLoggedIn;
