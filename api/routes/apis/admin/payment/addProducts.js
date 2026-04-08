const express = require('express');
const router = express.Router();
const isAdmin = require('../../../../middlewares/isAdmin');
const pool = require('../../../../database/sqlConnection');


router.post('/admin/products', isAdmin, async (req, res) => {
    try {
        const { product_id, name, coins, price, description } = req.body;

        
        const [result] = await pool.query(
            'INSERT INTO products (product_id, name, coins, price, description) VALUES (?, ?, ?, ?, ?)',
            [product_id, name, coins, price, description]
        );

        
        res.status(201).json({ id: result.insertId, message: 'Product created successfully' });
    } catch (error) {
        console.error("Product Creation Error:", error);
        res.status(500).send('Error creating product');
    }
});

router.get('/admin/products', isAdmin, async (req, res) => {
    try {
        
        const [products] = await pool.query('SELECT * FROM products');
        res.json(products);
    } catch (error) {
        console.error("Fetch Products Error:", error);
        res.status(500).send('Error fetching products');
    }
});

module.exports = router;