


async function notifyModerators(countryCode, depositDetails) {
    try {
    
    const [moderators] = await pool.query(`
        SELECT 
            u.phone_number
        FROM moderators m
        JOIN users u ON m.user_id = u.id
        JOIN moderator_countries mc ON m.id = mc.moderator_id
        WHERE m.status = 'active'
        AND mc.country_code = ?
    `, [countryCode]);
    
    if (moderators.length === 0) {
        console.log(`No moderators found for country: ${countryCode}`);
        return;
    }
    
    const message = `🔔 *New Deposit Request*\n\n` +
    `Hello dear moderator,\n` +
    `A new deposit request has been submitted:\n\n` +
        `*Amount:* ${depositDetails.amount}\n` +
        `*Payment Method:* ${depositDetails.paymentMethod}\n` +
        `*User Phone:* ${depositDetails.userPhone}\n` +
        `*Transaction ID:* ${depositDetails.transactionId}\n` +
        `*Country:* ${countryCode}\n` +
        `*Date:* ${new Date().toLocaleString()}\n\n` +
        `Please click here to see approve or reject the request: \n${process.env.SITE_URL}/mods/deposit-requests.`;
    
    
    for (const moderator of moderators) {
        const phoneNumber = moderator.phone_number.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        
        try {
            await sock.sendMessage(phoneNumber, { text: message });
            console.log(`Notification sent to moderator: ${moderator.phone_number}`);
        } catch (err) {
            console.error(`Failed to send WhatsApp message to ${moderator.phone_number}:`, err);
        }
    }
    } catch (error) {
    console.error('Error in notifyModerators:', error);
    }
    }
    module.exports = notifyModerators;