const express = require('express');
const router = express.Router();
const pool = require('../../../database/sqlConnection');
const isLoggedIn = require('../../../middlewares/isLoggedin');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const transporter = require('../../../database/emailConnection');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const unlink = promisify(fs.unlink);


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const tempUploadPath = path.join(__dirname, '../../../../temp');
        
        try {
            
            fs.mkdirSync(tempUploadPath, { recursive: true });
            cb(null, tempUploadPath);
        } catch (err) {
            cb(err, null);
        }
    },
    filename: function (req, file, cb) {
        const userId = req.session.user.id;
        const fileExtension = path.extname(file.originalname);
        cb(null, `user-${userId}-${Date.now()}${fileExtension}`);
    }
});




const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    },
    limits: { 
        fileSize: 5 * 1024 * 1024 
    }
});
router.post('/upload-profile-picture', isLoggedIn, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            console.log('No file uploaded.');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const userId = req.session.user.id;
        const file = req.file;

        
        if (!file.path) {
            console.error('File path is undefined');
            throw new Error('File path is undefined');
        }

        console.log('File uploaded, preparing to send to CDN...');

        
        const formData = new FormData();
        formData.append('file', fs.createReadStream(file.path), {
            filename: file.originalname,
            contentType: file.mimetype
        });

        
        console.log('Uploading file to CDN...');
        const cdnResponse = await axios.post('https://cdn.talkdrove.com/host/upload.php', formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        
        if (cdnResponse.data.status !== 'success') {
            console.error('CDN upload failed');
            throw new Error('CDN upload failed');
        }

        console.log('CDN upload successful, updating user profile...');

        
        const profilePicturePath = cdnResponse.data.cdnUrl;

        
        console.log('Updating user profile with new picture path...');
        await pool.query('UPDATE users SET profile_picture = ? WHERE id = ?', [profilePicturePath, userId]);

        
        console.log('Removing temporary local file...');
        await unlink(file.path);

        res.json({
            success: true,
            message: 'Profile picture uploaded successfully',
            profilePicture: profilePicturePath
        });
    } catch (error) {
        console.error('Error uploading profile picture:', error);

        
        if (req.file && req.file.path) {
            try {
                console.log('Removing temporary file...');
                await unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error removing temporary file:', unlinkError);
            }

            
            if (error.response) {
                console.error('CDN Response Error:', error.response.data);
            }
        }

        res.status(500).json({ error: 'An error occurred while uploading profile picture' });
    }
});


router.get('/get-profile-picture', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [users] = await pool.query('SELECT profile_picture FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const profilePicture = users[0].profile_picture || 'https://cdn.talkdrove.com/host/Images/profile.webp';

        res.json({ 
            success: true, 
            profilePicture: profilePicture 
        });
    } catch (error) {
        console.error('Error fetching profile picture:', error);
        res.status(500).json({ error: 'An error occurred while fetching profile picture' });
    }
});








const emailVerificationCodes = new Map();
const crypto = require('crypto');
const { EmailSenderManager } = require('../auth/emailRoute');
const nodemailer = require('nodemailer');


router.post('/request-email-update', isLoggedIn, async (req, res) => {
    
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { newEmail, currentPassword } = req.body;
        const userId = req.session.user.id;

        
        if (!validator.isEmail(newEmail)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        
        const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = users[0];

        
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        
        const [existingUsers] = await connection.query('SELECT * FROM users WHERE email = ?', [newEmail]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        
        const emailSenderManager = new EmailSenderManager(pool);

        
        const [availableSenders] = await connection.query(`
            SELECT * FROM email_senders 
            WHERE is_active = 1
            AND current_daily_count < daily_limit 
        `);

        
        const verificationCode = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 6);

        
        async function sendVerificationEmail(sender) {
            const senderTransporter = nodemailer.createTransport({
                host: sender.host,
                port: sender.port,
                auth: {
                    user: sender.email,
                    pass: sender.password
                },
                secure: sender.port === 465,
                tls: {
                    rejectUnauthorized: false
                }
            });


            console.log('trying with sender:', sender)
            await senderTransporter.sendMail({
                from: sender.email,
                to: newEmail,
                subject: '🔐 Verify Email Update - TalkDrove',
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
                                                    🔐 Email Update Request
                                                </h1>
                                            </td>
                                        </tr>
                                        
                                        <tr>
                                            <td style="padding: 30px 40px;">
                                                <p style="margin: 0 0 20px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333;">
                                                    We received a request to update your email address. To verify this change, please use the code below:
                                                </p>
                                                
                                                <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; text-align: center; margin: 30px 0;">
                                                    <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #ff9800; letter-spacing: 5px;">
                                                        ${verificationCode}
                                                    </span>
                                                </div>

                                                <div style="border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; background-color: #ffebee;">
                                                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #d32f2f;">
                                                        <strong>Wasn't you?</strong> If you didn't request this email update, please:
                                                        <br>1. Keep your current email
                                                        <br>2. Change your password immediately
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

            
            await emailSenderManager.trackEmailSent(sender.id);
        }

        
        let emailSent = false;
        let chosenSender = null;

        for (const sender of availableSenders) {
            try {
                await sendVerificationEmail(sender);
                emailSent = true;
                chosenSender = sender;
                break;
            } catch (emailError) {
                console.error(`Failed to send email with sender ${sender.email}:`, emailError);
                
                await emailSenderManager.updateEmailSender(sender.id, { 
                    is_active: 0 
                });
                continue;
            }
        }

        
        if (!emailSent) {
            await connection.rollback();
            return res.status(500).json({
                success: false,
                message: 'Unable to send verification email. Please try again later.'
            });
        }

        
        emailVerificationCodes.set(userId.toString(), {
            newEmail,
            code: verificationCode,
            timestamp: Date.now(),
            attempts: 0,
            senderId: chosenSender.id
        });

        await connection.commit();

        return res.json({ 
            success: true, 
            message: 'Verification code sent to new email',
            pendingEmail: newEmail 
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error requesting email update:', error);
        res.status(500).json({ error: 'An error occurred while processing email update' });
    } finally {
        connection.release();
    }
});


router.post('/verify-email-update', isLoggedIn, async (req, res) => {
    const { verificationCode } = req.body;
    const userId = req.session.user.id;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const verificationData = emailVerificationCodes.get(userId.toString());

        if (!verificationData) {
            return res.status(400).json({ error: 'No email update request found' });
        }

        
        const isExpired = (Date.now() - verificationData.timestamp) > 30 * 60 * 1000;
        if (isExpired) {
            emailVerificationCodes.delete(userId.toString());
            return res.status(400).json({ error: 'Verification code has expired' });
        }

        
        if (verificationData.code !== verificationCode) {
            verificationData.attempts++;

            
            if (verificationData.attempts >= 3) {
                emailVerificationCodes.delete(userId.toString());
                return res.status(429).json({ error: 'Too many incorrect attempts' });
            }

            return res.status(400).json({ error: 'Invalid verification code' });
        }

        
        await connection.query('UPDATE users SET email = ? WHERE id = ?', [verificationData.newEmail, userId]);

        
        emailVerificationCodes.delete(userId.toString());

        await connection.commit();

        return res.json({ 
            success: true, 
            message: 'Email updated successfully',
            newEmail: verificationData.newEmail 
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error verifying email update:', error);
        res.status(500).json({ error: 'An error occurred while updating email' });
    } finally {
        connection.release();
    }
});

router.post('/update-user', isLoggedIn, async (req, res) => {
    const { 
        currentPassword, 
        newPassword, 
        firstName, 
        lastName, 
        username, 
        bio, 
        gender 
    } = req.body;
    const userId = req.session.user.id;

    try {
        
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = users[0];

        
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        
        let updateQuery = 'UPDATE users SET';
        const updateValues = [];

        
        if (newPassword) {
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            updateQuery += ' password = ?,';
            updateValues.push(hashedNewPassword);
        }

        if (firstName) {
            updateQuery += ' first_name = ?,';
            updateValues.push(firstName);
        }

        if (lastName) {
            updateQuery += ' last_name = ?,';
            updateValues.push(lastName);
        }

        if (username) {
            
            const [existingUsernames] = await pool.query(
                'SELECT id FROM users WHERE LOWER(username) = LOWER(?)',
                [username]
            );

            if (existingUsernames.length > 0 && existingUsernames[0].id !== userId) {
                return res.status(400).json({ error: 'Username is already taken' });
            }

            updateQuery += ' username = ?,';
            updateValues.push(username);
        }

        if (bio) {
            updateQuery += ' bio = ?,';
            updateValues.push(bio);
        }

        if (gender) {
            updateQuery += ' gender = ?,';
            updateValues.push(gender);
        }

        
        updateQuery = updateQuery.slice(0, -1) + ' WHERE id = ?';
        updateValues.push(userId);

        
        if (updateValues.length > 1) {
            await pool.query(updateQuery, updateValues);
        }

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'An error occurred while updating profile' });
    }
});





router.post('/update-extra-details', isLoggedIn, async (req, res) => {
    const { 
        currentPassword,
        whatsappLink,
        youtubeLink,
        websiteLink,
        githubLink,
        linkedinLink,
        twitterLink,
        instagramLink
    } = req.body;
    const userId = req.session.user.id;

    try {
        
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = users[0];

        
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        
        const validatedLinks = {
            whatsapp_link: whatsappLink && isValidUrl(whatsappLink) ? whatsappLink : null,
            youtube_link: youtubeLink && isValidUrl(youtubeLink) ? youtubeLink : null,
            website_link: websiteLink && isValidUrl(websiteLink) ? websiteLink : null,
            github_link: githubLink && isValidUrl(githubLink) ? githubLink : null,
            linkedin_link: linkedinLink && isValidUrl(linkedinLink) ? linkedinLink : null,
            twitter_link: twitterLink && isValidUrl(twitterLink) ? twitterLink : null,
            instagram_link: instagramLink && isValidUrl(instagramLink) ? instagramLink : null
        };

        
        await pool.query(
            `UPDATE users SET 
            whatsapp_link = ?, 
            youtube_link = ?, 
            website_link = ?, 
            github_link = ?, 
            linkedin_link = ?, 
            twitter_link = ?, 
            instagram_link = ? 
            WHERE id = ?`, 
            [
                validatedLinks.whatsapp_link,
                validatedLinks.youtube_link,
                validatedLinks.website_link,
                validatedLinks.github_link,
                validatedLinks.linkedin_link,
                validatedLinks.twitter_link,
                validatedLinks.instagram_link,
                userId
            ]
        );

        res.json({ success: true, message: 'Extra details updated successfully' });
    } catch (error) {
        console.error('Error updating extra details:', error);
        res.status(500).json({ error: 'An error occurred while updating extra details' });
    }
});


function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}


router.get('/get-extra-details', isLoggedIn, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const [users] = await pool.query(`
            SELECT 
            whatsapp_link, 
            youtube_link, 
            website_link, 
            github_link, 
            linkedin_link, 
            twitter_link, 
            instagram_link 
            FROM users WHERE id = ?`, [userId]);

        if (users.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = users[0];
        res.json({
            success: true,
            whatsappLink: user.whatsapp_link,
            youtubeLink: user.youtube_link,
            websiteLink: user.website_link,
            githubLink: user.github_link,
            linkedinLink: user.linkedin_link,
            twitterLink: user.twitter_link,
            instagramLink: user.instagram_link
        });
    } catch (error) {
        console.error('Error fetching extra details:', error);
        res.status(500).json({ error: 'An error occurred while fetching extra details' });
    }
});


function cleanupEmailVerificationCodes() {
    const now = Date.now();
    for (const [key, verification] of emailVerificationCodes.entries()) {
        if (now - verification.timestamp > 30 * 60 * 1000) {
            console.log(`Removing expired email verification code for user ${key}`);
            emailVerificationCodes.delete(key);
        }
    }
}



setInterval(cleanupEmailVerificationCodes, 10 * 60 * 1000);

module.exports = router;