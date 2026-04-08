const express = require('express');
const path = require('path');
const  isAdmin  = require('../middlewares/isAdmin');
const  isLoggedIn  = require('../middlewares/isLoggedin');
const router = express.Router();


router.get('/', isAdmin, isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'public', 'admin', 'admin.html'));
});
router.get('/users', isAdmin, isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'public', 'admin', 'users.html'));
});
router.get('/bots', isAdmin, isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'public', 'admin', 'bots.html'));
});


router.get('/manage-products', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', "admin",'product-management.html'));
});
router.get('/bot-req', isAdmin, isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'public', 'admin', 'botRequest.html'));
});
router.get('/manage-moderators', isAdmin, isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'public', 'admin', 'manageModerator.html'));
});
router.get('/payment-stats', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'public', 'admin', 'payment-stats.html'));
});

router.get('/add-apikeys', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'public', 'admin', 'add-apikeys.html'));
});

router.get('/user-notifications', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'public', 'admin', 'user-notifications.html'));
});
router.get('/manage-payment-methods', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'public', 'admin', 'manage-payment-methods.html'));
});
router.get('/add-heroku', isLoggedIn, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'public', 'admin', 'add-heroku.html'));
});
router.get('/bots/approved-bots/', isLoggedIn, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'public','admin', 'approved-bots.html'));
});
router.get('/bots/change-request', isLoggedIn, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'public','admin', 'botChangeRequest.html'));
});
router.get('/support/tickets', isLoggedIn, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'admin', 'supportTickets.html'));
});

router.get('/support/tickets/:ticketId/edit', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'admin', 'ticketEdit.html'));
});
router.get('/emails', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'admin', 'emails.html'));
});
router.get('/banned-appeal', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'admin', 'bannedAppeal.html'));
});
router.get('/contact-requests', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'admin', 'contactUs.html'));
});
router.get('/maintenance-stats', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'admin', 'maintenanceStats.html'));
});
module.exports = router;