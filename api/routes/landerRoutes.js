const express = require('express');
const path = require('path')
const router = express.Router();


router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public',  'front-end', 'lander.html'));
});
router.get('/system-status', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public',  'system-status.html'));
});
router.get('/faq', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'front-end',  'FAQ.html'));
});
router.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'front-end',  'contactUs.html'));
});
router.get('/privacy-policy', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public',  'front-end', 'privacy.html'));
});
router.get('/terms-of-service', (req, res) => {
    res.sendFile(path.join(__dirname,  '..', '..', 'public',  'front-end', 'terms-of-service.html'));
});
router.get('/banned', (req, res) => {
    if (req.session.user && req.session.user.is_banned === 1) {
        res.render('banned'); 
    } else {
        res.redirect('/dashboard'); 
    }
});

module.exports = router;
