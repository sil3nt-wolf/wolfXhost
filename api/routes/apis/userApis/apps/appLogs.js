const express = require('express');
const router = express.Router();
const pool = require('../../../../database/sqlConnection')
const axios = require('axios')
const http = require('http');
const server = http.createServer(router);
const WebSocket = require('ws');


const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const wss = new WebSocket.Server({
    server,
    verifyClient: (info) => {
        const path = info.req.url;
        return path.startsWith('/api/logs/') && path.includes('/stream');
    }
});


const activeConnections = new Map();


wss.on('connection', async (ws, req) => {
    
    let appName;
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        appName = url.pathname.split('/').filter(Boolean)[2]; 

        if (!appName) {
            throw new Error('Invalid app name');
        }
    } catch (error) {
        console.error('Invalid WebSocket URL:', error);
        ws.close(1003, 'Invalid app name');
        return;
    }

    
    const userEmail = req.session?.user?.email || '[REDACTED EMAIL]';

    
    const connectionId = Date.now().toString();
    let logSession = null;
    let logWs = null;

    const connection = {
        ws,
        logWs: null,
        timer: setTimeout(() => {
            cleanup('Connection timeout');
        }, 30000) 
    };

    activeConnections.set(connectionId, connection);

    
    const cleanup = (reason = 'Normal closure') => {
        clearTimeout(connection.timer);
        if (logWs) {
            logWs.close(1000, reason);
        }
        if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, reason);
        }
        activeConnections.delete(connectionId);
        console.log(`Cleaned up connection ${connectionId}: ${reason}`);
    };

    
    try {
        ws.send(JSON.stringify({ type: 'status', message: 'Connecting to log stream...' }));
    } catch (error) {
        cleanup('Failed to send initial status');
        return;
    }

    
    ws.on('ping', () => {
        try {
            ws.pong();
        } catch (error) {
            console.error('Error sending pong:', error);
        }
    });

    let pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.ping();
            } catch (error) {
                console.error('Error sending ping:', error);
                cleanup('Ping failed');
            }
        }
    }, 30000);

    try {
        
        const connection = await Promise.race([
            pool.getConnection(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Database connection timeout')), 5000)
            )
        ]);

        
        const [apiKeys] = await connection.query(
            'SELECT api_key FROM heroku_api_keys WHERE is_active = true'
        );
        connection.release();

        if (!apiKeys.length) {
            throw new Error('No active API keys found');
        }

        
        let sessionCreated = false;
        for (const { api_key } of apiKeys) {
            try {
                logSession = await axios.post(
                    `https://api.heroku.com/apps/${appName}/log-sessions`,
                    { tail: true },
                    {
                        headers: {
                            'Authorization': `Bearer ${api_key}`,
                            'Accept': 'application/vnd.heroku+json; version=3'
                        },
                        timeout: 5000 
                    }
                );
                sessionCreated = true;
                break;
            } catch (error) {
                console.error(`Failed to create log session with API key: ${error.message}`);
                continue;
            }
        }

        if (!sessionCreated || !logSession?.data?.logplex_url) {
            throw new Error('Failed to create log session');
        }

        
        logWs = new WebSocket(logSession.data.logplex_url);
        connection.logWs = logWs;

        
        logWs.on('open', () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'status', message: 'Connected to log stream' }));
            }
        });

        logWs.on('message', (data) => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    const logLine = data.toString();
                    const processed = processLogLine(logLine, userEmail);
                    ws.send(JSON.stringify({ type: 'log', data: processed }));
                } catch (error) {
                    console.error('Error processing log line:', error);
                }
            }
        });

        logWs.on('error', (error) => {
            console.error('Heroku log stream error:', error);
            cleanup('Log stream error');
        });

        logWs.on('close', () => {
            cleanup('Log stream closed');
        });

        
        ws.on('error', (error) => {
            console.error('Client WebSocket error:', error);
            cleanup('Client error');
        });

        ws.on('close', () => {
            cleanup('Client closed connection');
        });

    } catch (error) {
        console.error('Error in WebSocket connection:', error);
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'error',
                message: `Connection error: ${error.message}`
            }));
        }
        cleanup('Setup error');
    }
});

router.get('/api/logs/:appName', async (req, res) => {
    const appName = req.params.appName;
    const { lines = 100, source, dyno } = req.query;
    const userEmail = req.session?.user?.email || '[REDACTED EMAIL]';
    let connection;

    try {
        connection = await pool.getConnection();

        
        const [apiKeys] = await connection.query(
            'SELECT api_key FROM heroku_api_keys WHERE is_active = true'
        );

        let logs = null;
        let lastError = null;

        for (const { api_key } of apiKeys) {
            try {
                const queryParams = new URLSearchParams({
                    lines: lines.toString(),
                    ...(source && { source }),
                    ...(dyno && { dyno })
                });

                const sessionResponse = await axios.post(
                    `https://api.heroku.com/apps/${appName}/log-sessions`,
                    {
                        lines,
                        source,
                        dyno,
                        tail: false
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${api_key}`,
                            'Accept': 'application/vnd.heroku+json; version=3',
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (sessionResponse.data && sessionResponse.data.logplex_url) {
                    const logsResponse = await axios.get(sessionResponse.data.logplex_url);
                    logs = logsResponse.data;
                    break;
                }
            } catch (error) {
                lastError = error;
                continue;
            }
        }

        if (logs) {
            const processedLogs = logs
                .split('\n')
                .filter(line => line.trim())
                .map(line => processLogLine(line, userEmail));

            res.json({
                success: true,
                appName,
                logs: processedLogs
            });
        } else {
            throw lastError || new Error('Failed to fetch logs');
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({
            success: false,
            error: `Failed to fetch logs: ${error.message}`
        });
    } finally {
        if (connection) {
            try {
                connection.release();
            } catch (releaseError) {
                console.error('Error releasing connection:', releaseError);
            }
        }
    }
});


function processLogLine(line, userEmail = '[REDACTED EMAIL]') {
    try {
        if (!line || typeof line !== 'string') {
            return { type: 'raw', message: String(line) };
        }

        const matches = line.match(/^([\d-]+T[\d:.]+Z) (\w+)\[(\w+)\]: (.+)$/);
        if (matches) {
            
            const message = matches[4].replace(EMAIL_PATTERN, userEmail);
            
            return {
                type: 'structured',
                timestamp: matches[1],
                source: matches[2],
                dyno: matches[3],
                message: message
            };
        }

        
        const processedLine = line.replace(EMAIL_PATTERN, userEmail);
        return { type: 'raw', message: processedLine };
    } catch (e) {
        console.error('Error processing log line:', e);
        return { type: 'raw', message: String(line) };
    }
}


setInterval(() => {
    for (const [id, connection] of activeConnections) {
        if (connection.ws.readyState === WebSocket.CLOSED) {
            activeConnections.delete(id);
        }
    }
}, 60000);

module.exports = router;