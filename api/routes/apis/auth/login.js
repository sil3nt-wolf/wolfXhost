const express = require('express');
const router = express.Router();
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const requestIp = require('request-ip');
const pool = require('../../../database/sqlConnection');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const validator = require('validator');
const transporter = require('../../../database/emailConnection');


router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));


const verificationCodes = new Map();
const rateLimit = new Map();


const EMAIL_LOGIN_QUERY = `
    SELECT u.* 
    FROM users u USE INDEX (idx_email)
    WHERE u.email = ?
`;

const USERNAME_LOGIN_QUERY = `
    SELECT u.* 
    FROM users u USE INDEX (idx_username)
    WHERE u.username = ?
`;


function checkRateLimit(ip, identifier) {
    const key = `${ip}:${identifier}`;
    const now = Date.now();
    const attempts = rateLimit.get(key) || { count: 0, timestamp: now };
    
    if (now - attempts.timestamp > 15 * 60 * 1000) {
        attempts.count = 1;
        attempts.timestamp = now;
    } else if (attempts.count >= 5) {
        return false;
    } else {
        attempts.count++;
    }
    
    rateLimit.set(key, attempts);
    return true;
}


const normalizeIp = (ip) => {
    if (!ip) return '0.0.0.0';
    if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
    return ip.replace(/^::ffff:/, '');
};

// Enhanced device info collection
function getDeviceInfo(req) {
    const ua = new UAParser(req.headers['user-agent']);
    const browser = ua.getBrowser();
    const os = ua.getOS();
    const device = ua.getDevice();
    
    return {
        browser: `${browser.name || 'Unknown'} ${browser.version || ''}`.trim(),
        os: `${os.name || 'Unknown'} ${os.version || ''}`.trim(),
        device: device.type || 'desktop',
        userAgent: req.headers['user-agent']
    };
}


function getClientIp(req) {
    const ipHeaders = ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'x-client-ip'];
    
    for (const header of ipHeaders) {
        const ip = req.headers[header];
        if (ip) {
            const possibleIp = ip.toString().split(',')[0].trim();
            if (/^(\d{1,3}\.){3}\d{1,3}$/.test(possibleIp)) {
                return possibleIp;
            }
        }
    }
    
    return normalizeIp(requestIp.getClientIp(req));
}


function generateVerificationCode(length = 6) {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .toUpperCase()
        .slice(0, length);
}


router.post('/login', async (req, res) => {
    let connection;
    
    try {
        const { identifier, password } = req.body;
        const clientIp = getClientIp(req);

        if (!identifier || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Username/Email and password are required' 
            });
        }

        
        if (!checkRateLimit(clientIp, identifier)) {
            return res.status(429).json({
                success: false,
                message: 'Too many login attempts. Please try again later.'
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        
        const isEmail = validator.isEmail(identifier);
        const [users] = await connection.query(
            isEmail ? EMAIL_LOGIN_QUERY : USERNAME_LOGIN_QUERY,
            [identifier]
        );

        if (users.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false,
                message: 'Account not found' 
            });
        }

        const user = users[0];

        
        if (user.is_banned) {
            await connection.rollback();
            return res.status(403).json({ 
                success: false,
                message: 'This account has been suspended. Please contact support.' 
            });
        }

        
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
       
   
            
            await connection.commit();
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        
        const deviceInfo = getDeviceInfo(req);
        const geo = geoip.lookup(clientIp);
        const location = geo ? `${geo.city || 'Unknown City'}, ${geo.country}` : 'Unknown Location';
        const deviceId = crypto.randomUUID();

        
     const [knownDevices] = await connection.query(
    `SELECT id, device_info, last_used 
     FROM user_devices 
     WHERE user_id = ? 
     AND device_info = ? 
     AND is_verified = 1
     AND last_used > DATE_SUB(NOW(), INTERVAL 30 DAY)
     FOR UPDATE`,
    [user.id, JSON.stringify(deviceInfo)]
);

        if (knownDevices.length > 0) {
            
            await Promise.all([
                connection.query(
                    'UPDATE user_devices SET last_used = NOW(), ip_address = ? WHERE id = ?',
                    [clientIp, knownDevices[0].id]
                ),
                connection.query(
                    'UPDATE users SET last_login = NOW() WHERE id = ?',
                    [user.id]
                ),
           
            ]);

            await connection.commit();

            req.session.user = {
                id: user.id,
                email: user.email,
                username: user.username,
                isVerified: true,
                is_admin: user.is_admin === 1,
                deviceId: knownDevices[0].id
            };
            
            return res.json({
                success: true,
                message: 'Login successful',
                requireVerification: false,
                user: {
                    email: user.email,
                    username: user.username
                }
            });
        }

        
        const verificationCode = generateVerificationCode();

        try {
            await transporter.sendMail({
                from: '"TalkDrove Security" <msg@talkdrove.com>',
                to: user.email,
                subject: '🔐 Verify New Device Login - TalkDrove',
                html: `
                                        <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td align="center" style="padding: 40px 0;">
                                    <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                                        <tr>
                                            <td style="padding: 30px 40px 20px; text-align: left; background-color: #ff9800; border-radius: 8px 8px 0 0;">
                                                <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 24px; color: white;">
                                                    🔐 New Device Login Detected
                                                </h1>
                                            </td>
                                        </tr>
                                        
                                        <tr>
                                            <td style="padding: 30px 40px;">
                                                <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333;">
                                                    We detected a login attempt from a new device. For your security, please verify this login using the code below:
                                                </p>
                                                
                                                <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; text-align: center; margin: 30px 0;">
                                                    <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #ff9800; letter-spacing: 5px;">
                                                        ${verificationCode}
                                                    </span>
                                                </div>

                                                <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0;">
                                                    <h2 style="margin: 0 0 15px; font-family: Arial, sans-serif; font-size: 18px; color: #333333;">
                                                        Login Details
                                                    </h2>
                                                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                        <tr>
                                                            <td style="padding: 8px 0; font-family: Arial, sans-serif; font-size: 14px; color: #666666;">
                                                                📍 Location:
                                                            </td>
                                                            <td style="padding: 8px 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; font-weight: bold;">
                                                                ${location}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 8px 0; font-family: Arial, sans-serif; font-size: 14px; color: #666666;">
                                                                🕒 Time:
                                                            </td>
                                                            <td style="padding: 8px 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; font-weight: bold;">
                                                                ${new Date().toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </div>

                                                <div style="border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; background-color: #ffebee;">
                                                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #d32f2f;">
                                                        <strong>Wasn't you?</strong> If you didn't attempt this login, please:
                                                        <br>1. Change your password immediately
                                                        <br>2. Enable two-factor authentication
                                                        <br>3. Contact our support team
                                                    </p>
                                                </div>

                                                <p style="margin: 20px 0 0; font-family: Arial, sans-serif; font-size: 14px; color: #666666;">
                                                    This verification code will expire in 30 minutes for your security.
                                                </p>
                                            </td>
                                        </tr>
                                        
                                        <tr>
                                            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #eeeeee;">
                                                <p style="margin: 0; font-family: Arial, sans-serif; font-size: 12px; color: #999999;">
                                                    This is an automated message from TalkDrove Security. Please do not reply to this email.
                                                    <br>© ${new Date().getFullYear()} TalkDrove. All rights reserved.
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                `
            });
        } catch (emailError) {
            await connection.rollback();
            console.error('Failed to send verification email:', emailError);
            return res.status(500).json({
                success: false,
                message: 'Unable to send verification email. Please try again later.'
            });
        }

        
        await connection.query(
            `INSERT INTO user_devices (id, user_id, ip_address, device_info, location, last_used, is_verified)
             VALUES (?, ?, ?, ?, ?, NOW(), 0)
             ON DUPLICATE KEY UPDATE last_used = NOW()`,
            [deviceId, user.id, clientIp, JSON.stringify(deviceInfo), location]
        );

        
        verificationCodes.set(identifier, {
            code: verificationCode,
            timestamp: Date.now(),
            attempts: 0,
            deviceId,
            userId: user.id,
            username: user.username,
            email: user.email,
            is_admin: user.is_admin === 1
        });

        await connection.commit();

        return res.json({
            success: true,
            message: 'Verification code sent to your email',
            requireVerification: true,
            pendingDeviceId: deviceId
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Login error:', error);
        return res.status(500).json({ 
            success: false,
            message: 'An unexpected error occurred' 
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});



router.post('/verify-device-login', async (req, res) => {
    const { identifier, code } = req.body;

    
    if (!identifier || !code) {
        return res.status(400).json({ 
            success: false,
            message: 'Email/Username and verification code are required' 
        });
    }

    try {
        
        const verificationData = verificationCodes.get(identifier);

        if (!verificationData) {
            return res.status(400).json({ 
                success: false,
                message: 'No verification request found. Please request a new code.' 
            });
        }

        
        const isExpired = (Date.now() - verificationData.timestamp) > 30 * 60 * 1000;
        if (isExpired) {
            verificationCodes.delete(identifier);
            return res.status(400).json({ 
                success: false,
                message: 'Verification code has expired. Please request a new code.' 
            });
        }

        
        if (verificationData.code !== code) {
            verificationData.attempts++;

            
            if (verificationData.attempts >= 3) {
                verificationCodes.delete(identifier);
                return res.status(429).json({ 
                    success: false,
                    message: 'Too many incorrect attempts. Please request a new code.' 
                });
            }

            return res.status(400).json({ 
                success: false,
                message: 'Invalid verification code' 
            });
        }

        
        await pool.query(
            'UPDATE user_devices SET is_verified = 1, last_used = NOW() WHERE id = ?',
            [verificationData.deviceId]
        );

        
        const query = validator.isEmail(identifier) ? 'SELECT * FROM users WHERE email = ?' : 'SELECT * FROM users WHERE username = ?';
        const [users] = await pool.query(query, [identifier]);
        const user = users[0];

        
        req.session.user = {
            id: user.id,
            email: user.email,
            isVerified: true,
            is_admin: user.is_admin === 1,
            deviceId: verificationData.deviceId
        };

        
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        
        verificationCodes.delete(identifier);

        return res.status(200).json({
            success: true,
            message: 'Device verified successfully',
            user: req.session.user
        });

    } catch (error) {
        console.error('Device verification error:', error);
        res.status(500).json({ 
            success: false,
            message: 'An unexpected error occurred during device verification' 
        });
    }
});

function cleanupVerificationCodes() {
    const now = Date.now();
    for (const [key, verification] of verificationCodes.entries()) {
        if (now - verification.timestamp > 30 * 60 * 1000) {
            console.log(`Removing expired verification code for ${key}`);
            verificationCodes.delete(key);
        }
    }
}


setInterval(cleanupVerificationCodes, 10 * 60 * 1000);

module.exports = router;
