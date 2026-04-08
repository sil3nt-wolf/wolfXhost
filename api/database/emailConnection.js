const nodemailer = require('nodemailer');











const transporter = nodemailer.createTransport({
    host: 'yourhost.com',
    port: 465, 
    secure: true,
    auth: {
        user: 'whatever@yours.com',
        pass: ''
    }
});


module.exports = transporter;