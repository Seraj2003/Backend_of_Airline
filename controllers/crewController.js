const db = require('../config/db.js')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')
// add crew only admin can add crew members 
const addNewCrewMember = async (req, res) => {
    const { name, phone, role, email, address, salary, password } = req.body;
    const id = req.user.user_id;
    if (!name || !phone || !role || !salary || !address || !email || !password) {
        return res.status(404).json({ success: false, message: "Missing Details" });
    }
    try {
        const [user] = await db.query('SELECT ROLE,name,email FROM users WHERE id =? ', [id])
        const row = user[0];
         console.log(row)
        if (!row) return res.status(404).json({ success: false, message: 'Register Yourself as a Admin' });
        if (row.ROLE != "ADMIN") return res.status(400).json({ success: false, message: 'Only Admin Can Add New Crew Members' });
        const hashpassword = await bcrypt.hash(password, 10)
       
        const [crew] = await db.query('INSERT INTO crew_members (name , role , phone ,salary ,address , email ,password ) values (?,?,?,?,?,?,?)', [name, role, phone, salary, address, email, hashpassword])
        if (crew.insertId) return res.status(200).json({ success: true, message: 'Crew Member Added Successfully', Crew_Id: crew.insertId });
        res.status(404).json({ success: false, message: 'Field To add crew' })
    } catch (error) {
        console.log(error)
        res.status(501).json({ success: false, message: error.message })
    }
}
// login as a crew member

const login = async (req, res) => {
    const { crew_id, password } = req.body;
    if (!crew_id) {
        return res.status(404).json({ success: false, message: 'Enter Crew Id' })
    } else if (!password) {
        return res.status(404).json({ success: false, message: 'Enter Password' })
    }
    try {
        const [result] = await db.query('SELECT * FROM crew_members WHERE crew_id = ?', [crew_id])
        const crew = result[0];
        if (!crew) return res.status(404).json({ success: false, message: 'Crew Not Found' })

        const isMatch = await bcrypt.compare(password, crew.password);

        if (!isMatch) {
            return res.status(404).json({ success: false, message: 'Incorect Password' })
        }
        
        const token = jwt.sign(
            { crew_id: crew.crew_id, email: crew.email },
            process.env.SECRET,
            { expiresIn: '1h' }
        );

        if (typeof token !== 'string') {
            return res.status(500).json({ success: false, message: 'Token generation failed' });
        }
        res.cookie('token', token, {
            httpOnly: true,   // cannot be accessed by JS (protects from XSS)
            secure: false,    // set to true if using HTTPS
            sameSite: 'lax',  // CSRF protection
            maxAge: 3600000
        })
        res.status(200).json({ success: true, message: 'Login Successfully' ,token})
    } catch (error) {
        console.log(error)
        res.status(501).json({ success: false, message: error.message })
    }
}
//
const schedule = async (req,res) =>{
    const crew_id = req.user.crew_id;
    if(!crew_id) return res.status(404).json({success:false, message: "Login Please"})
    try {
        db.query("SELECT *FROM crew_assignments WHERE ")

    } catch (error) {
         console.log(error)
        res.status(501).json({ success: false, message: error.message })
    }
}


module.exports = { addNewCrewMember, login , schedule}