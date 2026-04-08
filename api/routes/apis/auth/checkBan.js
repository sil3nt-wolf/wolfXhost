const express = require('express');
const router = express.Router();

router.get('/check-ban', (req, res) => {
    if (req.session.user.is_banned == 1) {
      
      res.render('banned');
    } else {
      
      res.send('You are not banned.');
    }
  });
  module.exports = router;