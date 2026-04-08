const pool = require('../../../database/sqlConnection');
const DeploymentManager = require('./deploymentManager');
const { checkHerokuAppStatus } = require('./deployWithMultipleKeys');

async function checkAndRedeployInactiveApps() {
    try {
        
        const connection = await pool.getConnection();
        
        try {
            
            const [deployments] = await connection.query(`
                SELECT 
                    id, user_id, bot_id, heroku_app_name, 
                    last_status_check, created_at
                FROM deployed_apps 
                WHERE 
                    status = 'active' AND 
                    (last_status_check IS NULL OR last_status_check < DATE_SUB(NOW(), INTERVAL 1 HOUR))
            `);

            for (const deployment of deployments) {
                try {
                    
                    const localDeployment = DeploymentManager.getDeployment(deployment.id);
                    
                    if (!localDeployment) continue;

                    
                    const apiKey = await getRandomApiKey(connection); 
                    const appStatus = await checkHerokuAppStatus(apiKey, deployment.heroku_app_name);

                    if (!appStatus.active) {
                        console.log(`Inactive app detected: ${deployment.heroku_app_name}. Attempting redeployment.`);
                        
                        
                        const redeployResult = await DeploymentManager.autoRedeploy(deployment.id);

                        if (redeployResult) {
                            
                            await connection.query(
                                'UPDATE deployed_apps SET heroku_app_name = ?, status = ?, last_status_check = NOW() WHERE id = ?', 
                                [redeployResult.appData.name, 'active', deployment.id]
                            );
                        }
                    }

                    
                    await connection.query(
                        'UPDATE deployed_apps SET last_status_check = NOW() WHERE id = ?', 
                        [deployment.id]
                    );

                } catch (deploymentError) {
                    console.error(`Error processing deployment ${deployment.id}:`, deploymentError);
                }
            }
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error in deployment status check:', error);
    }
}

module.exports = checkAndRedeployInactiveApps;