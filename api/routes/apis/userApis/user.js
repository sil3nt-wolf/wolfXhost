const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const isLoggedIn = require('../../../middlewares/isLoggedin');

router.get('/get-current-user', isLoggedIn, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const [users] = await pool.query(
            'SELECT id, first_name, last_name, username, email, bio, gender, profile_picture FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        res.json({
            success: true,
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            email: user.email,
            bio: user.bio,
            gender: user.gender,
            profile_picture: user.profile_picture
        });

    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'An error occurred while fetching user details' });
    }
});

router.get('/api/profile/:username', async (req, res) => {
    const { username } = req.params;
    const authenticatedUserId = req.session.user.id; 

    try {
        
        const [users] = await pool.query(`
            SELECT u.id, u.username, u.profile_picture, u.first_name, u.last_name, u.bio, u.email,  
                   whatsapp_link, youtube_link, website_link, github_link, 
                   linkedin_link, twitter_link, instagram_link,
                   uc.country
            FROM users u
            LEFT JOIN user_country uc ON u.id = uc.user_id
            WHERE LOWER(u.username) = LOWER(?)
        `, [username]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        
        const [bots] = await pool.query(`
            SELECT id, name, repo_url, deployment_cost, 
                   total_deployments, website_url, updated_at, 
                   popularity_tier
            FROM bots
            WHERE dev_email = ?
        `, [users[0].email]);

        
        const [followCheck] = await pool.query(`
            SELECT COUNT(*) as is_following 
            FROM user_follows 
            WHERE follower_id = ? AND followed_id = ?
        `, [authenticatedUserId, users[0].id]);

        
        const [followersCount] = await pool.query(`
            SELECT COUNT(*) as followers 
            FROM user_follows 
            WHERE followed_id = ?
        `, [users[0].id]);

        const [followingCount] = await pool.query(`
            SELECT COUNT(*) as following 
            FROM user_follows 
            WHERE follower_id = ?
        `, [users[0].id]);

        
        const response = {
            ...users[0],
            bots: bots,
            is_following: followCheck[0].is_following > 0,
            followers_count: followersCount[0].followers,
            following_count: followingCount[0].following
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'An error occurred while fetching profile' });
    }
});


router.post('/api/follow/:username', isLoggedIn, async (req, res) => {
    const { username } = req.params;
    const followerId = req.session.user.id;

    try {
        
        const [users] = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const followedId = users[0].id;

        
        const [existingFollow] = await pool.query(
            'SELECT * FROM user_follows WHERE follower_id = ? AND followed_id = ?', 
            [followerId, followedId]
        );

        if (existingFollow.length > 0) {
            
            await pool.query(
                'DELETE FROM user_follows WHERE follower_id = ? AND followed_id = ?', 
                [followerId, followedId]
            );
            return res.json({ status: 'unfollowed' });
        } else {
            
            await pool.query(
                'INSERT INTO user_follows (follower_id, followed_id) VALUES (?, ?)', 
                [followerId, followedId]
            );
            return res.json({ status: 'followed' });
        }
    } catch (error) {
        console.error('Error following/unfollowing user:', error);
        res.status(500).json({ error: 'An error occurred while processing follow request' });
    }
});

module.exports = router;