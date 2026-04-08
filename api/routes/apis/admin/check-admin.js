const express = require('express')
const router = express.Router();



router.get('/check-admin', (req, res) => {
    console.log('Current session:', req.session);
    res.json({
        isAdmin: req.session.user?.is_admin === true,
        sessionData: req.session
    });
});
yield
module.exports = router;