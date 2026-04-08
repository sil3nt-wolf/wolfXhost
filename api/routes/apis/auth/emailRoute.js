const express = require('express');
const pool = require('../../../database/sqlConnection');
const router = express.Router();
const cron = require('node-cron');
const isAdmin = require('../../../middlewares/isAdmin');


class EmailSenderManager {
    constructor(pool) {
        this.pool = pool;
    }

    
    async addEmailSender(emailData) {
        const connection = await this.pool.getConnection();
        try {
            const {
                email,
                password,
                host = 'mail.talkdrove.cc.nf',
                port = 587,
                daily_limit = 150
            } = emailData;

            const [result] = await connection.query(
                `INSERT INTO email_senders (email, password, host, port, daily_limit) 
                VALUES (?, ?, ?, ?, ?)`,
                [email, password, host, port, daily_limit]
            );

            return result.insertId;
        } finally {
            connection.release();
        }
    }

    
    async getAvailableSender() {
        const connection = await this.pool.getConnection();
        try {
            const [senders] = await connection.query(`
                SELECT * FROM email_senders 
                WHERE is_active = 1 
                AND current_daily_count < daily_limit 
                AND (last_reset_date IS NULL OR last_reset_date != CURRENT_DATE)
                ORDER BY current_daily_count ASC 
                LIMIT 1
            `);

            return senders[0] || null;
        } finally {
            connection.release();
        }
    }

  
async updateEmailSender(id, updateData) {
    const connection = await this.pool.getConnection();
    try {
        if (Object.keys(updateData).length === 0) {
            throw new Error('No update data provided');
        }

        const updateFields = Object.keys(updateData)
            .map(key => `${key} = ?`)
            .join(', ');

        const values = [...Object.values(updateData), id];

        await connection.query(
            `UPDATE email_senders SET ${updateFields} WHERE id = ?`,
            values
        );
    } finally {
        connection.release();
    }
}
    
    async resetDailyCounts() {
        const connection = await this.pool.getConnection();
        try {
            await connection.query(`
                UPDATE email_senders 
                SET current_daily_count = 0, is_active = 1, last_reset_date = CURRENT_DATE
            `);
        } finally {
            connection.release();
        }
    }

    
    async resetHourlyMsgEmail() {
        const connection = await this.pool.getConnection();
        try {
            await connection.query(`
                UPDATE email_senders 
                SET current_daily_count = 0, is_active = 1, last_reset_date = CURRENT_DATE
                WHERE email = 'msg@talkdrove.com'
            `);
            console.log('Hourly count for msg@talkdrove.com has been reset successfully.');
        } catch (error) {
            console.error('Error resetting hourly count for msg@talkdrove.com:', error.message);
        } finally {
            connection.release();
        }
    }

    
    async trackEmailSent(senderId) {
        const connection = await this.pool.getConnection();
        try {
            await connection.query(`
                UPDATE email_senders 
                SET current_daily_count = current_daily_count + 1,
                    total_emails_sent = total_emails_sent + 1,
                    last_used_timestamp = NOW()
                WHERE id = ?
            `, [senderId]);
        } finally {
            connection.release();
        }
    }

    
    async getAllEmailSenders() {
        const connection = await this.pool.getConnection();
        try {
            const [senders] = await connection.query(`
                SELECT 
                    id, email, host, port, is_active, 
                    daily_limit, current_daily_count, 
                    total_emails_sent, last_used_timestamp,
                    CASE 
                        WHEN last_reset_date != CURRENT_DATE THEN 'Ready'
                        WHEN current_daily_count >= daily_limit THEN 'Limit Reached'
                        ELSE 'Active' 
                    END as status
                FROM email_senders
                ORDER BY last_used_timestamp DESC
            `);
            return senders;
        } finally {
            connection.release();
        }
    }
}


router.post('/api/admin/add-email', isAdmin, async (req, res) => {
    try {
        const emailSenderManager = new EmailSenderManager(pool);
        const newSenderId = await emailSenderManager.addEmailSender(req.body);

        res.json({
            success: true,
            message: 'Email sender added successfully',
            senderId: newSenderId
        });
    } catch (error) {
        console.error('Error adding email sender:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to add email sender'
        });
    }
});


router.put('/api/admin/update-email/:id', isAdmin, async (req, res) => {
    try {
        const emailSenderManager = new EmailSenderManager(pool);
        await emailSenderManager.updateEmailSender(req.params.id, req.body);

        res.json({
            success: true,
            message: 'Email sender updated successfully'
        });
    } catch (error) {
        console.error('Error updating email sender:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to update email sender'
        });
    }
});


router.get('/api/admin/all-emails', async (req, res) => {
    try {
        const emailSenderManager = new EmailSenderManager(pool);
        const senders = await emailSenderManager.getAllEmailSenders();

        res.json({
            success: true,
            senders
        });
    } catch (error) {
        console.error('Error fetching email senders:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch email senders'
        });
    }
});


function setupEmailResetJobs(pool) {
    const emailSenderManager = new EmailSenderManager(pool);

    
    cron.schedule('0 0 * * *', async () => {
        try {
            await emailSenderManager.resetDailyCounts();
            console.log('Daily email counts reset successfully.');
        } catch (error) {
            console.error('Error resetting daily email counts:', error.stack);
        }
    });

    
    cron.schedule('1 */1 * * *', async () => {
        try {
            await emailSenderManager.resetHourlyMsgEmail();
            console.log('Hourly email counts reset for msg@talkdrove.com.');
        } catch (error) {
            console.error('Error resetting hourly email counts:', error.stack);
        }
    });
}

module.exports = {
    EmailSenderManager,
    router,
    setupEmailResetJobs
};
