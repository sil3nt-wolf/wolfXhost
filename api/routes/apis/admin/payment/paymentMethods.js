const express = require('express')
const router = express.Router();
const isAdmin = require('../../../../middlewares/isAdmin')
const pool = require('../../../../database/sqlConnection')




router.post('/api/payment-methods', isAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    try {
    await connection.beginTransaction();
    
    const { 
        name, 
        account_name, 
        account_number, 
        instructions, 
        additional_info, 
        country_code 
    } = req.body;
    
    
    if (!country_code) {
        throw new Error('Country code is required');
    }
    
    const instructionsString = Array.isArray(instructions) 
        ? instructions.join('\n')
        : instructions;
    
    
    const [methodResult] = await connection.query(
        'INSERT INTO payment_methods (name, status, country_code) VALUES (?, ?, ?)',
        [name, 'active', country_code]
    );
    
    
    await connection.query(`
        INSERT INTO payment_method_details 
        (payment_method_id, account_name, account_number, instructions, additional_info, status, country_code)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
        methodResult.insertId,
        account_name,
        account_number,
        instructionsString || null,
        additional_info || null,
        'active',
        country_code
    ]);
    
    await connection.commit();
    res.json({ 
        message: 'Payment method created successfully',
        id: methodResult.insertId 
    });
    } catch (error) {
    await connection.rollback();
    console.error('Error creating payment method:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment method' });
    } finally {
    connection.release();
    }
    });
    
    
    
    router.post('/api/payment-methods/:id/toggle-status', isAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    try {
    await connection.beginTransaction();
    
    const methodId = req.params.id;
    
    
    const [currentStatus] = await connection.query(
        'SELECT status FROM payment_methods WHERE id = ?',
        [methodId]
    );
    
    if (currentStatus.length === 0) {
        throw new Error('Payment method not found');
    }
    
    const newStatus = currentStatus[0].status === 'active' ? 'inactive' : 'active';
    
    
    await connection.query(
        'UPDATE payment_methods SET status = ? WHERE id = ?',
        [newStatus, methodId]
    );
    
    
    await connection.query(
        'UPDATE payment_method_details SET status = ? WHERE payment_method_id = ?',
        [newStatus, methodId]
    );
    
    await connection.commit();
    res.json({ message: 'Status updated successfully', status: newStatus });
    } catch (error) {
    await connection.rollback();
    console.error('Error toggling payment method status:', error);
    res.status(500).json({ error: 'Failed to toggle status' });
    } finally {
    connection.release();
    }
    });
    
    
    
    router.put('/api/payment-methods/:id', isAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    try {
    await connection.beginTransaction();
    
    const { 
        name, 
        account_name, 
        account_number, 
        instructions, 
        additional_info,
        country_code 
    } = req.body;
    const methodId = req.params.id;
    
    
    const instructionsString = Array.isArray(instructions) 
        ? instructions.join('\n')
        : instructions;
    
    
    await connection.query(
        'UPDATE payment_methods SET name = ?, country_code = ? WHERE id = ?',
        [name, country_code || 'ALL', methodId]
    );
    
    
    const [existingDetails] = await connection.query(
        'SELECT id FROM payment_method_details WHERE payment_method_id = ? AND status = ?',
        [methodId, 'active']
    );
    
    if (existingDetails.length > 0) {
        await connection.query(`
            UPDATE payment_method_details 
            SET account_name = ?, account_number = ?, instructions = ?, 
                additional_info = ?, country_code = ?
            WHERE payment_method_id = ? AND status = ?
        `, [
            account_name,
            account_number,
            instructionsString || null,
            additional_info || null,
            country_code || 'ALL',
            methodId,
            'active'
        ]);
    } else {
        await connection.query(`
            INSERT INTO payment_method_details 
            (payment_method_id, account_name, account_number, instructions, 
             additional_info, status, country_code)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            methodId,
            account_name,
            account_number,
            instructionsString || null,
            additional_info || null,
            'active',
            country_code || 'ALL'
        ]);
    }
    
    await connection.commit();
    res.json({ message: 'Payment method updated successfully' });
    } catch (error) {
    await connection.rollback();
    console.error('Error updating payment method:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
    } finally {
    connection.release();
    }
    });
    
    
    router.get('/api/payment-method-details/:id', async (req, res) => {
    try {
        const [details] = await pool.query(`
            SELECT 
                account_name,
                account_number,
                additional_info
            FROM payment_method_details
            WHERE payment_method_id = ?
            AND status = 'active'
            LIMIT 1
        `, [req.params.id]);
        
        if (details.length === 0) {
            return res.status(404).json({ error: 'Payment method details not found' });
        }
        
        res.json(details[0]);
    } catch (error) {
        console.error('Error fetching payment details:', error);
        res.status(500).json({ error: 'Failed to fetch payment details' });
    }
    });
    

router.get('/api/admin/payment-methods', isAdmin, async (req, res) => {
    try {
    const [methods] = await pool.query(`
        SELECT 
            pm.id,
            pm.name,
            pm.status,
            pm.country_code,
            pm.created_at,
            pmd.account_name,
            pmd.account_number,
            pmd.instructions,
            pmd.additional_info
        FROM payment_methods pm
        LEFT JOIN payment_method_details pmd ON pm.id = pmd.payment_method_id
        WHERE pmd.status = 'active'
        ORDER BY pm.created_at DESC
    `);
    
    res.json({ 
        methods: methods.map(method => ({
            ...method,
            instructions: method.instructions ? method.instructions.split('\n') : []
        }))
    });
    } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
    });
    
    