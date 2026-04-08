const express = require('express');
const path = require('path');
const isLoggedIn = require('../middlewares/isLoggedin');
const router = express.Router();





router.get('/dashboard', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'dashboard', 'index.html'));
});
router.get('/invite', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'invite', 'invite.html'));
});
router.get('/payment-success', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public',  'paymentSuccess.html'));
});
router.get('/wallet', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..',  'public', 'wallet.html'));
});
router.get('/account-settings', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'account-settings.html'));
});
router.get('/buy-heroku', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'buy-heroku.html'));
});
router.get('/my-heroku', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'my-heroku.html'));
});
router.get('/wallet/deposit/', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'buy-coins.html'));
});

router.get('/new-bot/', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'bot-request.html'));
});

router.get('/earn-coins/', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'subscribe-channel.html'));
});
router.get('/my-bots/', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'my-bots.html'));
});
router.get('/support/', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'dashboard', 'support', 'supportTicket.html'));
});
router.get('/user/:username', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public',  'userProfile.html'));
});
router.get('/terminal/', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public',  'terminal.html'));
});
module.exports = router;