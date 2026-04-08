require('dotenv').config();
const pool = require('./backend/database/sqlConnection');
const deleteApp = require('./backend/middlewares/deleteApp');


async function handleAppDeletion(app, user, reason) {
    try {
        await deleteApp(app.heroku_app_name);
        await pool.query('DELETE FROM deployed_apps WHERE id = ?', [app.id]);
        console.log(`Successfully deleted app ${app.heroku_app_name} for user ${user.email}. Reason: ${reason}`);
        return true;
    } catch (error) {
        console.error(`Failed to delete app ${app.heroku_app_name}:`, error);
        return false;
    }
}


async function processAppMaintenance(app, user, connection) {
    try {
        const deploymentTime = new Date(app.deployed_at).getTime();
        const currentTime = new Date().getTime();
        const hoursSinceDeployment = (currentTime - deploymentTime) / (1000 * 60 * 60);

        if (hoursSinceDeployment < 24) return;

        const [botRows] = await connection.query(
            'SELECT deployment_cost FROM bots WHERE id = ?',
            [app.bot_id]
        );

        if (botRows.length === 0) {
            console.error(`Bot not found for app ${app.id}`);
            return;
        }

        const deploymentCost = botRows[0].deployment_cost;

        const [userRows] = await connection.query(
            'SELECT coins FROM users WHERE id = ? FOR UPDATE',
            [user.id]
        );

        if (userRows[0].coins < deploymentCost) {
            await handleAppDeletion(app, user, 'insufficient_coins_24h');
            await connection.query(
                'INSERT INTO maintenance_logs (app_id, user_id, action, reason) VALUES (?, ?, ?, ?)',
                [app.id, user.id, 'delete', 'insufficient_coins']
            );
        } else {
            await connection.query(
                'UPDATE users SET coins = coins - ? WHERE id = ?',
                [deploymentCost, user.id]
            );
            await connection.query(
                'UPDATE deployed_apps SET last_coin_deduction = CURRENT_TIMESTAMP WHERE id = ?',
                [app.id]
            );
            await connection.query(
                'INSERT INTO coin_transactions (sender_email, amount, transaction_type, app_id) VALUES (?, ?, ?, ?)',
                [user.email, deploymentCost, '24h_maintenance', app.id]
            );
            console.log(`Deducted ${deploymentCost} coins from user ${user.email} for app ${app.heroku_app_name}`);
        }
    } catch (error) {
        console.error(`Error processing maintenance for app ${app.id}:`, error);
        throw error;
    }
}


async function runMaintenanceCheck() {
    if (global.isMaintenanceRunning) {
        console.log('Previous maintenance job still running, skipping...');
        return;
    }

    global.isMaintenanceRunning = true;
    const batchSize = 50;
    let offset = 0;

    try {
        while (true) {
            const connection = await pool.getConnection();
            await connection.beginTransaction();

            const [apps] = await connection.query(`
                SELECT 
                    da.*,
                    u.email,
                    u.coins,
                    u.id as user_id
                FROM deployed_apps da
                JOIN users u ON da.user_id = u.id
                WHERE 
                    da.last_coin_deduction IS NULL 
                    OR da.last_coin_deduction < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 24 HOUR)
                ORDER BY da.deployed_at ASC
                LIMIT ? OFFSET ?
            `, [batchSize, offset]);

            if (apps.length === 0) {
                await connection.commit();
                connection.release();
                break;
            }

            for (const app of apps) {
                try {
                    await processAppMaintenance(app, { id: app.user_id, email: app.email }, connection);
                    await new Promise(resolve => setTimeout(resolve, 1000));  
                } catch (error) {
                    console.error(`Failed to process app ${app.id}:`, error.message);
                }
            }

            offset += batchSize;
            await connection.commit();
            connection.release();
        }

        console.log('Maintenance check completed successfully');
    } catch (error) {
        console.error('Error in maintenance check:', error);
    } finally {
        global.isMaintenanceRunning = false;
    }
}

runMaintenanceCheck();

module.exports = runMaintenanceCheck;