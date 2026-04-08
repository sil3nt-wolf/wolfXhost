const generateReferralCode = require('./generateReferralCode');
const express = require('express');
const router = express.Router();
const pool = require('../../../../database/sqlConnection')
const isLoggedIn  = require('../../../../middlewares/isLoggedin');


router.get('/api/referral', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [userRows] = await pool.query('SELECT referral_code FROM users WHERE id = ?', [userId]);
        
        if (!userRows.length) {
            return res.status(404).json({ error: 'User not found' });
        }

        const referralCode = userRows[0].referral_code || generateReferralCode(); 
        
        
        if (!userRows[0].referral_code) {
            await pool.query('UPDATE users SET referral_code = ? WHERE id = ?', [referralCode, userId]);
        }

        const [referrals] = await pool.query(`
            SELECT u.email, u.created_at 
            FROM users u 
            WHERE referred_by = ?
        `, [userId]);

        res.json({
            referralCode: referralCode,
            referralLink: `${process.env.SITE_URL}/auth/signup?ref=${referralCode}`,
            referralCount: referrals.length,
            referrals: referrals
        });
    } catch (error) {
        console.error('Error fetching referral info:', error);
        res.status(500).json({ error: 'An error occurred while fetching referral information' });
    }
});

module.exports = router;