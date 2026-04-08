const notifyModerators = require('../moderatorApis/notifyModerators');
const express = require('express');
const path = require('path');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const isLoggedIn = require('../../../middlewares/isLoggedin');
const attachUserCountry = require('../../../middlewares/attachUserCountry');
const multer = require('multer');

router.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, 'uploads/'));  
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 
    },
    fileFilter: function(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});


router.post('/api/deposit-coins', isLoggedIn, attachUserCountry, upload.single('paymentScreenshot'), async (req, res) => {
    const amount = Number(req.body.amount);
    const paymentMethodId = Number(req.body.paymentMethod);
    const userCountry = req.userCountry;

    try {
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        if (!paymentMethodId) {
            return res.status(400).json({ error: 'Payment method is required' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Payment screenshot is required' });
        }

        
        const [paymentMethods] = await pool.query(`
            SELECT pm.* FROM payment_methods pm
            WHERE pm.id = ? 
            AND pm.status = 'active' 
            AND (pm.country_code = ? OR pm.country_code = 'ALL')
        `, [paymentMethodId, userCountry]);

        if (paymentMethods.length === 0) {
            return res.status(400).json({ error: 'Invalid or unavailable payment method' });
        }

        const filename = req.file.filename;

        
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            
            const [result] = await connection.query(`
                INSERT INTO coin_transactions 
                (recipient_email, amount, transaction_type, status, payment_screenshot, payment_method_id, country_code)
                VALUES (?, ?, 'deposit', 'pending', ?, ?, ?)
            `, [req.session.user.email, amount, filename, paymentMethodId, userCountry]);

            await connection.commit();

            
            const depositDetails = {
                amount,
                paymentMethod: paymentMethods[0].name,
                userEmail: req.session.user.email,
                transactionId: result.insertId
            };

            
            await notifyModerators(pool, userCountry, depositDetails, sock);

            res.json({
                message: 'Deposit request submitted successfully, awaiting approval.',
                transactionId: result.insertId
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error submitting deposit request:', error);
        res.status(500).json({ error: 'An error occurred while submitting deposit request.' });
    }
});


router.get('/api/user-transactions', isLoggedIn, async (req, res) => {
    try {
        const [transactions] = await pool.query(`
            SELECT 
                id,
                amount,
                status,
                payment_screenshot,
                created_at,
                approval_date
            FROM coin_transactions 
            WHERE recipient_email = ? 
            AND transaction_type = 'deposit'
            ORDER BY created_at DESC
            LIMIT 50
        `, [req.session.user.email]);

        res.json({ transactions });
    } catch (error) {
        console.error('Error fetching user transactions:', error);
        res.status(500).json({ error: 'An error occurred while fetching transactions' });
    }
});

module.exports = router;