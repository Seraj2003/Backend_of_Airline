const db = require('../config/db.js')
const bcrypt = require('bcryptjs');
// get user Profile
const getUser = async (req, res) => {
    const email = req.user.email;
    try {
        const [users] = await db.query('select name,role,status,passport_no, phone,email, address from users where email = ? ', [email]);

        if (users.length == 0) return res.status(404).json({ success: false, message: 'User not Found' });
        // const token = jwt.sign({ user_id: user.id, email },
        //     process.env.SECRET,
        //     { expiresIn: '1d' }
        // )
        // res.cookie('token', token, {
        //     httpOnly: true,   // cannot be accessed by JS (protects from XSS)
        //     secure: false,    // set to true if using HTTPS
        //     sameSite: 'lax',  // CSRF protection
        //     maxAge: 3600000
        // })
        res.status(200).json({ success: true, user: users[0] })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}

// update user details
const UpdateDetails = async (req, res) => {
    const email = req.user.email;
    const { name, phone, address } = req.body;
    if (!name && !phone && !address) return res.status(401).json({ success: false, message: 'missing details' })
    try {
        const result = await db.query('update users set name = ? , phone = ? , address = ? where email= ? ', [name, phone, address, email]);
        if (result.affectedRows === 0) return res.status(402).json({ success: false, message: 'user Failed to Update' })
        res.status(200).json({ success: true, message: 'User Details Updated sSuccessfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'Internal server error' + error })
    }
}
//delete user
const DeleteUser = async (req, res) => {
    const email = req.user.email;
    const { password } = req.body;
    if (!password) return res.status(404).json({ success: false, message: 'Enter Correct Password' })
    try {
        const [users] = await db.query('select password from  users where email = ? ', [email]);
        const user = users[0]
        if (!user || user.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(402).json({ success: false, message: 'Incorrect Password' })
        const result = await db.query("DELETE FROM users WHERE email = ?", [email])
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Failed to delete user' })
        }
        res.status(200).json({ success: true, message: 'User Deleted Successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'Internal server error' + error })
    }

}
module.exports = { getUser, DeleteUser, UpdateDetails };