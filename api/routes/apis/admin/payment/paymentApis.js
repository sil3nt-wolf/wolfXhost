const countryPrefixes = require('../../../../middlewares/countryPrefixes');
const express = require('express')
const router = express.Router();
const isAdmin = require('../../../../middlewares/isAdmin')
const pool = require('../../../../database/sqlConnection')




router.delete('/api/payment-methods/:id', isAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    try {
    await connection.beginTransaction();
    
    const methodId = req.params.id;
    
    
    await connection.query(
        'UPDATE payment_methods SET status = ? WHERE id = ?',
        ['deleted', methodId]
    );
    
    await connection.query(
        'UPDATE payment_method_details SET status = ? WHERE payment_method_id = ?',
        ['deleted', methodId]
    );
    
    await connection.commit();
    res.json({ message: 'Payment method deleted successfully' });
    } catch (error) {
    await connection.rollback();
    console.error('Error deleting payment method:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
    } finally {
    connection.release();
    }
    });


    

function getCountryFromPhone(phoneNumber) {
    
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Check for matches from longest to shortest prefix
    for (let i = 4; i >= 1; i--) {
    const prefix = cleanNumber.substring(0, i);
    if (countryPrefixes[prefix]) {
        return countryPrefixes[prefix];
    }
    }
    
    return 'ALL'; 
    }
    
    
    async function attachUserCountry(req, res, next) {
    try {
    if (!req.session?.user?.id) {
        req.userCountry = 'ALL';
        return next();
    }
    
    
    const [user] = await pool.query(
        'SELECT phone_number, country_code FROM users WHERE id = ?',
        [req.session.user.id]
    );
    
    if (user.length === 0) {
        req.userCountry = 'ALL';
        return next();
    }
    
    if (!user[0].country_code && user[0].phone_number) {
        
        const countryCode = getCountryFromPhone(user[0].phone_number);
        
        
        await pool.query(
            'UPDATE users SET country_code = ? WHERE id = ?',
            [countryCode, req.session.user.id]
        );
        
        req.userCountry = countryCode;
    } else {
        req.userCountry = user[0].country_code || 'ALL';
    }
    
    next();
    } catch (error) {
    console.error('Error in attachUserCountry middleware:', error);
    req.userCountry = 'ALL';
    next();
    }
    }
    
    
    router.get('/api/payment-methods', attachUserCountry, async (req, res) => {
    try {
    const userCountry = req.userCountry;
    
    const [methods] = await pool.query(`
        SELECT DISTINCT
            pm.id,
            pm.name,
            pm.status,
            pm.country_code,
            pmd.account_name,
            pmd.account_number,
            pmd.instructions,
            pmd.additional_info
        FROM payment_methods pm
        LEFT JOIN payment_method_details pmd ON pm.id = pmd.payment_method_id
        WHERE pmd.status = 'active'
        AND pm.status = 'active'
        AND (pm.country_code = ? OR pm.country_code = 'ALL')
        ORDER BY 
            CASE WHEN pm.country_code = ? THEN 0 ELSE 1 END,
            pm.created_at DESC
    `, [userCountry, userCountry]);
    
    res.json({ 
        methods: methods.map(method => ({
            ...method,
            instructions: method.instructions ? method.instructions.split('\n') : []
        })),
        userCountry: userCountry
    });
    } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
    });
    
    