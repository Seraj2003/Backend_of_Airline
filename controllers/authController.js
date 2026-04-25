const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')
const db = require('../config/db.js');
const emailQueue = require('../queue/emailQueue.js');

// console.log(process.env.SECRET)
const register = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'missing details' })
    }
    try {
        const [ExsitingUser] = await db.query('SELECT *from users WHERE email = ?', [email])
        if (ExsitingUser.length > 0) {
            return res.status(404).json({ success: false, message: 'User already Exsiting. Try another Email Address' })
        }
        const hashpassword = await bcrypt.hash(password, 10)
        await db.query('INSERT INTO users (name,email,password) VALUES (?,?,?)', [name, email, hashpassword])
        // generating jwt token
        // const token = jwt.sign(
        //     { user_id: user.id, email: user.email },                       // payload
        //     process.env.SECRET,                                           // must exist
        //     { expiresIn: '1d' }                                           // valid 1 day
        // );
        await emailQueue.add("WelcomeEmail", { name, email },{removeOnComplete:true})
        res.status(200).json({ success: true, message: 'User Register Successfully', })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'Internal servver error' + error })
    }
}
//login 
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(404).json({ success: false, message: 'Missing details' })
    }
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];
        if (users.length == 0) return res.status(404).json({ success: false, message: 'User not register' })
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(404).json({ success: false, message: 'Inavalid password' });
        const safeUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            address: user.address,
            status: user.status
        };
        //generating token
        const token = jwt.sign({ user_id: user.id, email },
            process.env.SECRET,
            { expiresIn: '1d' }
        )
        res.cookie('token', token, {
            httpOnly: true,   // cannot be accessed by JS (protects from XSS)
            secure: false,    // set to true if using HTTPS
            sameSite: 'lax',  // CSRF protection
            maxAge: 3600000
        })

        res.status(200).json({ success: true, message: 'Login Successfully', user: safeUser })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'Internal servver error' + error })
    }
}

// controllers/authController.js

// Logout Controller
const logoutUser = async (req, res) => {
    try {
        // Clear the cookie where JWT was stored
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // only over HTTPS in production
            sameSite: "strict",
        });

        return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: "Server error during logout" });
    }
};

//reset password
const forgatePass = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'missing details' });
    try {
        const users = await db.query('Select * from users where email = ? ', [email])
        const [user] = users[0]
        if (!user) return res.status(400).json({ success: false, message: 'Invalid Email' })

        const otp = Math.floor(1000 + Math.random() * 9000);
        // const token = jwt.sign(
        //     { email: user.email },                       // payload
        //     process.env.SECRET,                                           // must exist
        //     { expiresIn: '1d' }                                           // valid 1 day
        // );
        // await transporter.sendMail({
        //     from: ` "AirlLine" ${process.env.EMAIL_USER} `,
        //     to: email,
        //     subject: 'OTP Verification',
        //     html: `<h2> Hi ${email}, <br> Your OTP code is ${otp}. It is valid for 5 minutes.</h2>`
        // })

        // emailQueue job adding
        await emailQueue.add("sendOtp", { email, otp }, { removeOnComplete: true });

        const expiryDate = new Date(Date.now() + 5 * 60 * 1000);
        const mysqlexpiry = expiryDate.toISOString().slice(0, 19).replace('T', ' ');
        await db.query('UPDATE users SET reset_otp = ?, reset_otp_expiry = ?  WHERE email = ? ', [otp, mysqlexpiry, email])
        res.status(200).json({ success: true, message: 'OTP Send Successfully', otp })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'Internal servver error' + error })
    }
}
// otp verification 
const verifyOTP = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!otp || !newPassword) return res.status(404).json({ success: false, message: 'missing OTP and New Password' });
    try {
        const users = await db.query('select *from users where email = ? ', [email])
        const [user] = users[0];
        if (!user) res.status(200).json({ success: false, message: 'User not found' });
        if (Number(user.reset_otp) !== Number(otp)) {
            return res.status(404).json({ success: false, message: 'Invalid OTP' })
        }
        const hashpassword = await bcrypt.hash(newPassword, 10);
        await db.query("UPDATE users SET password = ?,  reset_otp = NULL, reset_otp_expiry = NULL  WHERE email = ?", [hashpassword, user.email])

        res.status(200).json({ success: true, message: 'Password Forgate Successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'Internal server error' + error })
    }
}
//  change password
const changePass = async (req, res) => {
    const { currentPass, newPassword } = req.body;
    const email = req.user.email;
    console.log(email)
    if (!currentPass || !newPassword) return res.status(401).json({ success: false, message: 'Missing Details' })
    try {
        const [[user]] = await db.query('select password from users where email = ? ', [email])
        const isMatch = await bcrypt.compare(currentPass, user.password);
        if (!isMatch) return res.status(402).json({ success: false, message: 'Current Passworld Miss Matching' })
        const hashNewpass = await bcrypt.hash(newPassword, 10)

        await db.query('UPDATE users SET password = ? WHERE email = ? ', [hashNewpass, user.email])


        res.status(200).json({ success: true, message: 'Password Changed' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'Internal server error' + error })
    }
}
module.exports = { register, login, forgatePass, verifyOTP, changePass, logoutUser }