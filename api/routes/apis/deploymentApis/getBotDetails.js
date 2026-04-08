const pool = require('../../../database/sqlConnection')






async function getBotDetails(botId) {
    try {
        const [botRows] = await pool.query('SELECT * FROM bots WHERE id = ?', [botId]);
        if (botRows.length === 0) {
            throw new Error('Bot not found');
        }

        const [envVars] = await pool.query('SELECT * FROM bot_env_vars WHERE bot_id = ?', [botId]);
        return {
            bot: botRows[0],
            envVars: envVars
        };
    } catch (error) {
        console.error('Error fetching bot details:', error);
        throw error;
    }
}
module.exports = getBotDetails;