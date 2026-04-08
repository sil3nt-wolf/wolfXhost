const express = require('express');
const path = require('path')
const router = express.Router();
const isModerator = require('../middlewares/isModerator');

router.get('/deposit-requests', isModerator, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'moderator', 'deposit-requests.html'));
    });

router.get('/bots', isModerator, (req, res) => {
        res.sendFile(path.join(__dirname, '..', '..', 'public', 'moderator', 'botModerator.html'));
        });

module.exports = router;