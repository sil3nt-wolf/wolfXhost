const express = require('express');
const path = require('path')
const router = express.Router();
router.use(express.static('public'));



router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'auth',  'login.html'));
});

router.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..',  'public', 'auth', 'signup.html'));
});
router.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..',  'public', 'auth', 'resetPassword.html'));
});

module.exports = router