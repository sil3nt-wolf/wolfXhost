const pool = require('../../database/sqlConnection');
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();
const router = express.Router();


router.get('/checkout/:productId', async (req, res) => {
    try {
        const userId = req.session.user.id; 
        if (!userId) {
            return res.status(401).send('User must be logged in to purchase');
        }

        const productId = req.params.productId;
        
        const [products] = await pool.query(
            'SELECT * FROM products WHERE product_id = ?', 
            [productId]
        );
        
        if (!products || products.length === 0) {
            return res.status(404).send('Product not found');
        }
        
        const product = products[0];
        console.log("Product ID:", product.product_id);
        
        
        const response = await axios.post(
            `${process.env.CREEM_API_URL}/checkouts`,
            {
                product_id: product.product_id
            },
            {
                headers: { 
                    "x-api-key": process.env.CREEM_API_KEY,
                    "Content-Type": "application/json"
                }
            }
        );
        
        console.log("Checkout Response:", response.data);
        
        
        const checkoutUrl = response.data.checkout_url;
        const checkoutId = checkoutUrl.split('/').pop();
        
        
        await pool.query(
            'INSERT INTO payment_requests (user_id, product_id, checkout_id, amount, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [userId, product.product_id, checkoutId, product.price, 'pending']
        );
        
        
        res.redirect(response.data.checkout_url);
    } catch (error) {
        console.error("Checkout Error:", error.response ? {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers
        } : error.message);
        res.status(500).send('Error creating checkout');
    }
});


router.get('/payment-success',  async (req, res) => {
    try {
        
        const { checkout_id, order_id, customer_id, product_id, signature } = req.query;
        
        
        console.log("Payment Success Redirect:", {
            checkout_id,
            order_id,
            product_id
        });
        
        
        await pool.query(
            'UPDATE payment_requests SET order_id = ?, customer_id = ?, status = ? WHERE checkout_id = ?',
            [order_id, customer_id, 'completed_redirect', checkout_id]
        );
        
        
        res.sendFile(path.join(__dirname, '..', '..', 'public', 'paymentSuccess.html'));
    } catch (error) {
        console.error("Payment Success Error:", error);
        res.redirect('/dashboard?payment=error');
    }
});


router.post('/api/webhook', async (req, res) => {
    const event = req.body;
    
    try {
        console.log("Webhook Event:", JSON.stringify(event, null, 2));
        
        if (event.eventType === "checkout.completed") {
            const order = event.object.order;
            const product = event.object.product;
            const checkout = event.object;
            const checkoutId = checkout.id;
            
            
            const [paymentRequests] = await pool.query(
                'SELECT * FROM payment_requests WHERE checkout_id = ?',
                [checkoutId]
            );
            
            if (!paymentRequests || paymentRequests.length === 0) {
                console.error("Payment request not found for checkout:", checkoutId);
                return res.status(404).send('Payment request not found');
            }
            
            const paymentRequest = paymentRequests[0];
            
            
            const [productDetails] = await pool.query(
                'SELECT coins FROM products WHERE product_id = ?', 
                [product.id]
            );
            
            if (!productDetails || productDetails.length === 0) {
                console.error("Product not found:", product.id);
                return res.status(404).send('Product not found');
            }
            
            const coinsPurchased = productDetails[0].coins;
            const userId = paymentRequest.user_id;
            
            
            const conn = await pool.getConnection();
            await conn.beginTransaction();
            
            try {
                
                await conn.query(
                    'INSERT INTO purchases (user_id, product_id, coins_purchased, checkout_id, order_id) VALUES (?, ?, ?, ?, ?)',
                    [userId, product.id, coinsPurchased, checkoutId, order.id]
                );
                
                
                await conn.query(
                    'UPDATE payment_requests SET status = ?, order_id = ? WHERE checkout_id = ?',
                    ['completed', order.id, checkoutId]
                );
                
                
                await conn.query(
                    'UPDATE users SET coins = coins + ? WHERE id = ?',
                    [coinsPurchased, userId]
                );
                
                
                await conn.query(
                    'INSERT INTO coin_transactions (sender_phone, recipient_phone, amount, transaction_type, transaction_date, ' +
                    'description, status, created_at, payment_method_id, sender_username, recipient_username, sender_email, recipient_email) ' +
                    'SELECT NULL, phone_number, ?, ?, NOW(), ?, ?, NOW(), ?, NULL, username, NULL, email ' +
                    'FROM users WHERE id = ?',
                    [coinsPurchased, 'deposit', `Purchase of ${coinsPurchased} coins`, 'approved', 1, userId]
                );
                
                
                await conn.commit();
                
                console.log("Payment Successful:", {
                    userId: userId,
                    productId: product.id,
                    coinsPurchased: coinsPurchased,
                    checkoutId: checkoutId,
                    orderId: order.id
                });
            } catch (err) {
                
                await conn.rollback();
                console.error("Transaction Error:", err);
                throw err;
            } finally {
                
                conn.release();
            }
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send('Webhook processing error');
    }
});


router.get('/api/payment-details', async (req, res) => {
    try {
        const checkoutId = req.query.checkout_id;
        
        if (!checkoutId) {
            return res.status(400).json({ error: 'Checkout ID is required' });
        }
        
        
        const userId = req.session.user?.id;
        
        
        const [paymentDetails] = await pool.query(`
            SELECT 
                pr.checkout_id, 
                pr.order_id, 
                pr.status, 
                pr.created_at, 
                p.name,
                p.price AS amount,
                p.coins AS coins_purchased,
                pur.id AS transaction_id
            FROM payment_requests pr
            JOIN products p ON pr.product_id = p.product_id
            LEFT JOIN purchases pur ON pr.checkout_id = pur.checkout_id
            WHERE pr.checkout_id = ? 
            ${userId ? 'AND pr.user_id = ?' : ''}
            LIMIT 1
        `, userId ? [checkoutId, userId] : [checkoutId]);
        
        if (!paymentDetails || paymentDetails.length === 0) {
            return res.status(404).json({ error: 'Payment details not found' });
        }
        
        
        res.json(paymentDetails[0]);
        
    } catch (error) {
        console.error("Error fetching payment details:", error);
        res.status(500).json({ error: 'Failed to fetch payment details' });
    }
});
module.exports = router;