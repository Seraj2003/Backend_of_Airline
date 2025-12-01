const nodemailer = require('nodemailer')
const transporter = nodemailer.createTransport({
    service: 'gmail',   // Gmail SMTP server
    port: 465,                // or 465 (SSL)
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }

})

module.exports = transporter;