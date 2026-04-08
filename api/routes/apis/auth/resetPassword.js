const generateVerificationCode = require('./generateVerificationCode');
const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const bcrypt = require('bcryptjs');
const emailConnection = require('../../../database/emailConnection');
const validator = require('validator');

const verificationCodesReset = new Map();

router.post('/request-password-reset', async (req, res) => {
    const { email } = req.body;

    if (!validator.isEmail(email)) {
        return res.status(400).json({ 
            success: false,
            message: 'Invalid email format' 
        });
    }

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No account found with this email' 
            });
        }

        const verificationCode = generateVerificationCode();
        
        verificationCodesReset.set(email, {
            code: verificationCode,
            timestamp: Date.now(),
            attempts: 0
        });

        const emailTemplate = {
            from: '"TalkDrove Security" <msg@talkdrove.com>',
            to: email,
            subject: 'Password Reset Request - TalkDrove',
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
                                                🔐 Password Reset Request
                                            </h1>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 30px 40px;">
                                            <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333;">
                                                You have requested a password reset for your TalkDrove account. Use the verification code below to reset your password:
                                            </p>
                                            <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; text-align: center; margin: 30px 0;">
                                                <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #ff9800; letter-spacing: 5px;">
                                                    ${verificationCode}
                                                </span>
                                            </div>
                                            <p style="margin: 20px 0 0; font-family: Arial, sans-serif; font-size: 14px; color: #666666;">
                                                This verification code will expire in 30 minutes for your security.
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #eeeeee;">
                                            <p style="margin: 0; font-family: Arial, sans-serif; font-size: 12px; color: #999999;">
                                                If you did not request this password reset, please ignore this email or contact support.
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
        };

        try {
            await emailConnection.sendMail(emailTemplate);
            console.log('Password reset verification email sent to:', email);
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email'
            });
        }

        res.json({
            success: true,
            message: 'Verification code sent to your email'
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while processing your request' 
        });
    }
});

router.post('/verify-reset-code', async (req, res) => {
    const { email, code } = req.body;

    try {
        const verification = verificationCodesReset.get(email);
        
        if (!verification) {
            return res.status(400).json({
                success: false,
                message: 'No verification pending or code expired'
            });
        }

        if ((Date.now() - verification.timestamp) > 30 * 60 * 1000) {
            verificationCodesReset.delete(email);
            return res.status(400).json({
                success: false,
                message: 'Verification code has expired. Please request a new code.'
            });
        }

        if (verification.code !== code) {
            verification.attempts++;
            if (verification.attempts >= 3) {
                verificationCodesReset.delete(email);
                return res.status(400).json({
                    success: false,
                    message: 'Too many failed attempts. Please request a new code.'
                });
            }

            return res.status(400).json({
                success: false,
                message: 'Invalid verification code',
                attemptsLeft: 3 - verification.attempts
            });
        }

        res.json({
            success: true,
            message: 'Code verified successfully'
        });

    } catch (error) {
        console.error('Reset code verification error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during verification'
        });
    }
});

router.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;

    if (!validator.isStrongPassword(newPassword, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
    })) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters long and include lowercase, uppercase, numbers, and symbols'
        });
    }

    try {
        const verification = verificationCodesReset.get(email);
        
        if (!verification || verification.code !== code) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );

        verificationCodesReset.delete(email);

        
        const confirmationEmail = {
            from: '"TalkDrove Security" <msg@talkdrove.com>',
            to: email,
            subject: 'Password Reset Successful - TalkDrove',
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
                                        <td style="padding: 30px 40px 20px; text-align: left; background-color: #4CAF50; border-radius: 8px 8px 0 0;">
                                            <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 24px; color: white;">
                                                ✅ Password Reset Successful
                                            </h1>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 30px 40px;">
                                            <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333;">
                                                Your TalkDrove account password has been successfully reset. You can now log in with your new password.
                                            </p>
                                            <p style="margin: 20px 0 0; font-family: Arial, sans-serif; font-size: 14px; color: #666666;">
                                                If you did not make this change, please contact our support team immediately.
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #eeeeee;">
                                            <p style="margin: 0; font-family: Arial, sans-serif; font-size: 12px; color: #999999;">
                                                © ${new Date().getFullYear()} TalkDrove. All rights reserved.
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
        };

        try {
            await emailConnection.sendMail(confirmationEmail);
        } catch (emailError) {
            console.error('Confirmation email sending error:', emailError);
        }

        res.json({
            success: true,
            message: 'Password reset successful'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while resetting password'
        });
    }
});

function cleanupVerificationCodes() {
    const now = Date.now();
    for (const [key, verification] of verificationCodesReset.entries()) {
        if (now - verification.timestamp > 30 * 60 * 1000) {
            console.log(`Removing expired password reset code for ${key}`);
            verificationCodesReset.delete(key);
        }
    }
}

setInterval(cleanupVerificationCodes, 10 * 60 * 1000);

module.exports = router;