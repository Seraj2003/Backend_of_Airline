const { Worker } = require("bullmq");
const connection = require('../config/connection')
const transporter = require('../config/nodemailer');

const emailWorker = new Worker("emailQueue", async (job) => {
    switch (job.name) {
        case "WelcomeEmail": {
            const { email, name } = job.data;
            await transporter.sendMail({
                from: `"Airline" ${process.env.EMAIL_USER}`,
                to: email,
                subject: "Welcome To SkyFly Airline",
                html: `<h4>Hi ${name}</h4></br>,

                <p>Welcome! We’re really happy to have you with us.</br>

                Your account has been successfully created, and you can now start exploring all the features available on our platform. Our goal is to make your experience simple, productive, and enjoyable from the very beginning.
                Thank you for joining us—we’re excited to have you as part of our community!
                </p><h5>
                Best regards,
                The Team</h5>`
            });
            console.log("Welcomed")
            break;
        }

        case "sendOtp": {
            const { email, otp } = job.data;
            await transporter.sendMail({
                from: `"Airline" ${process.env.EMAIL_USER}`,
                to: email,
                subject: "OTP Verification",
                html: `<h2>Hi ${email}<br>Your OTP is ${otp}. Valid for 5 minutes.</h2>`
            });
            console.log("OTP Sended")
            break;
        }
    }

},
    {
        connection
    });

emailWorker.on("completed", (job) => {
    console.log(`job ${job.id} completed`)
});


emailWorker.on("failed", (job) => {
    console.log(`job ${job.id} failed`)
})