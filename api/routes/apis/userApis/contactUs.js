
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const isAdmin = require('../../../middlewares/isAdmin');
const pool = require('../../../database/sqlConnection');


const validateContact = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please enter a valid email address'),
    body('subject')
        .trim()
        .isLength({ min: 5, max: 100 })
        .withMessage('Subject must be between 5 and 100 characters'),
    body('message')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Message must be between 10 and 1000 characters')
];


const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 5, 
    message: 'Too many contact requests from this IP, please try again after an hour'
});


router.post('/api/contact', contactLimiter, validateContact, async (req, res) => {
    try {
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        
        const { name, email, subject, message } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO ContactMessages (name, email, subject, message) VALUES (?, ?, ?, ?)',
            [name, email, subject, message]
        );

        
        res.status(201).json({
            message: 'Contact message received successfully',
            contactId: result.insertId
        });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            message: 'An error occurred while processing your request'
        });
    }
});




router.get('/admin/api/contact', isAdmin, async (req, res) => {
    try {
        const [messages] = await pool.execute(
            'SELECT * FROM ContactMessages ORDER BY createdAt DESC LIMIT 100'
        );

        res.json(messages);

    } catch (error) {
        console.error('Error fetching contact messages:', error);
        res.status(500).json({
            message: 'An error occurred while fetching contact messages'
        });
    }
});

module.exports = router;

module.exports = router;
