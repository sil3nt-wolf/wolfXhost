const express = require('express');
const router = express.Router();

router.get('/check-login', (req, res) => {
    
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'User not logged in' });
    }

    const user = req.session.user;

    
    if (user.is_banned === 1) {
        return res.status(200).json({ user }); 
    }

    
    return res.json({ user });
});


module.exports = router;
