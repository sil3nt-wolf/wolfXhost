const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const validator = require('email-validator');
const isDisposable = require('is-disposable-email');
const pool = require('../../../database/sqlConnection');
const transporter = require('../../../database/emailConnection');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

const verificationCodes = new Map();


const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [email, details] of verificationCodes.entries()) {
        if (now - details.timestamp > 30 * 60 * 1000) {
            verificationCodes.delete(email);
        }
    }
}, 15 * 60 * 1000);

function generateVerificationCode(length = 6) {
    return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

function generateReferralCode(length = 8) {
    return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

function validateUsername(username) {
    if (!username || username.trim().length < 3 || username.trim().length > 15) {
        return {
            valid: false,
            message: 'Username must be between 3 and 15 characters'
        };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return {
            valid: false,
            message: 'Username can only contain letters, numbers, and underscores'
        };
    }

    return { valid: true };
}

function normalizeEmail(email) {
    const [localPart, domain] = email.toLowerCase().split('@');
    const normalizedLocal = localPart.split('+')[0].replace(/\./g, '');
    return `${normalizedLocal}@${domain}`;
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
    
    return req.ip || '0.0.0.0';
}

router.post('/signup', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { email, password, country, referralCode, username } = req.body;
        
        
        const usernameValidation = validateUsername(username);
        if (!usernameValidation.valid) {
            return res.status(400).json({ success: false, message: usernameValidation.message });
        }

        
        if (!password || password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
        }

        
        if (!validator.validate(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        const normalizedEmail = normalizeEmail(email);
        
        
        const allowedDomains = ['gmail.com', 'talkdrove.com'];
        const domain = normalizedEmail.split('@')[1].toLowerCase();
        if (!allowedDomains.includes(domain)) {
            return res.status(400).json({ success: false, message: 'Only Gmail and TalkDrove emails are allowed' });
        }

        
        if (isDisposable(normalizedEmail)) {
            return res.status(400).json({ success: false, message: 'Temporary/disposable emails are not allowed' });
        }

        await connection.beginTransaction();

        
        const [existingUsers] = await connection.query(
            'SELECT email, username FROM users WHERE LOWER(email) = ? OR LOWER(username) = LOWER(?)',
            [normalizedEmail, username]
        );

        if (existingUsers.length > 0) {
            await connection.rollback();
            if (existingUsers.find(user => user.email.toLowerCase() === normalizedEmail)) {
                return res.status(400).json({ success: false, message: 'Email already registered' });
            }
            return res.status(400).json({ success: false, message: 'Username is already taken' });
        }

        
        let referredById = null;
        if (referralCode) {
            const [referrer] = await connection.query(
                'SELECT id FROM users WHERE referral_code = ? FOR UPDATE',
                [referralCode]
            );
            if (referrer.length > 0) {
                referredById = referrer[0].id;
            }
        }

        
        const verificationCode = generateVerificationCode();
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUserReferralCode = generateReferralCode();
        const clientIp = getClientIp(req);

        
        try {
            await transporter.sendMail({
                from: '"TalkDrove Verification" <msg@talkdrove.com>',
                to: email,
                subject: 'Verify Your TalkDrove Account',
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
                                                    Verify Your TalkDrove Account!
                                                </h1>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 20px 40px;">
                                                <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #555555;">
                                                    Thanks for signing up for TalkDrove! Please use the verification code below to complete your registration:
                                                </p>
                                                
                                                <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; text-align: center; margin: 30px 0;">
                                                    <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #2196F3; letter-spacing: 5px;">
                                                        ${verificationCode}
                                                    </span>
                                                </div>
                                                
                                                <p style="margin: 0 0 10px; font-family: Arial, sans-serif; font-size: 14px; color: #666666;">
                                                    This code will expire in 30 minutes for security purposes.
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
            console.error('Email sending error:', emailError);
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email. Please try again later.'
            });
        }

        
        verificationCodes.set(normalizedEmail, {
            code: verificationCode,
            password: hashedPassword,
            username,
            country,
            timestamp: Date.now(),
            attempts: 0,
            referredBy: referredById,
            clientIp,
            referralCode: newUserReferralCode,
            originalEmail: email
        });

        await connection.commit();

        return res.json({
            success: true,
            message: 'Verification code sent. Please check your email.'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Signup Error:', error);
        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred during signup'
        });
    } finally {
        connection.release();
    }
});

router.post('/verify-signup', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { email, code } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const verification = verificationCodes.get(normalizedEmail);
        
        
        if (!verification || Date.now() - verification.timestamp > 30 * 60 * 1000) {
            verificationCodes.delete(normalizedEmail);
            return res.status(400).json({
                success: false,
                message: 'No verification pending or code expired'
            });
        }

        
        if (verification.code !== code) {
            verification.attempts++;
            if (verification.attempts >= 5) {
                verificationCodes.delete(normalizedEmail);
                return res.status(400).json({
                    success: false,
                    message: 'Too many failed attempts. Please try again.'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code',
                attemptsLeft: 5 - verification.attempts
            });
        }

        await connection.beginTransaction();

        
        await connection.query(
            `INSERT INTO ip_account_tracking (ip_address, account_count, last_signup)
             VALUES (?, 1, NOW())
             ON DUPLICATE KEY UPDATE 
             account_count = account_count + 1,
             last_signup = NOW()`,
            [verification.clientIp]
        );

        
        const [userResult] = await connection.query(
            `INSERT INTO users (
                email, password, is_verified, referral_code, coins,
                created_at, last_login, status, is_banned, username, referred_by
            ) VALUES (?, ?, true, ?, 0, NOW(), NOW(), 'active', false, ?, ?)`,
            [
                normalizedEmail,
                verification.password,
                verification.referralCode,
                verification.username,
                verification.referredBy
            ]
        );

        const userId = userResult.insertId;

        
        await connection.query(
            'INSERT INTO user_country (user_id, country) VALUES (?, ?)',
            [userId, verification.country]
        );

        
        if (verification.referredBy) {
            await connection.query(
                'UPDATE users SET coins = coins + 10 WHERE id = ?',
                [verification.referredBy]
            );
        }

        await connection.commit();
        verificationCodes.delete(normalizedEmail);

        
        req.session.user = {
            id: userId,
            email: normalizedEmail,
            isVerified: true,
            is_banned: false,
            is_admin: 0
        };

        return res.json({
            success: true,
            message: 'Registration successful!',
            user: {
                id: userId,
                email: normalizedEmail,
                username: verification.username,
                referralCode: verification.referralCode,
                country: verification.country
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Verification Error:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred during verification'
        });
    } finally {
        connection.release();
    }
});

module.exports = router;