const db = require('../config/db.js')
const bcrypt = require('bcryptjs');
const transporter = require('../config/nodemailer.js')
const jwt = require('jsonwebtoken')
// add crew only admin can add crew members 
const addNewCrewMember = async (req, res) => {
    const { name, phone, role, email, address, salary, password } = req.body;
    const username = req.user.email;
    if (!name || !phone || !role || !salary || !address || !email || !password) {
        return res.status(404).json({ success: false, message: "Missing Details" });
    }
    try {
        console.log(username)
        const [user] = await db.query('SELECT ROLE,name,email FROM users WHERE email = ? ', [username])
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
            return res.status(200).json({ success: false, message: 'Incorect Password' })
        }
        console.log("hii");
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
        console.log("token", token)
        res.status(200).json({ success: true, message: 'Login Successfully', crew, token })
    } catch (error) {
        console.log(error)
        res.status(501).json({ success: false, message: error.message })
    }
}
//


const assignCrewToFlight = async (req, res) => {
    const { crew_id, flight_id, duty_role } = req.body;

    if (!crew_id || !flight_id || !duty_role) {
        return res.status(400).json({
            success: false,
            message: "crew_id, flight_id and duty_role are required"
        });
    }

    try {
        /* --------------------------------------------------
           1️⃣ Validate crew
        -------------------------------------------------- */
        const [[crew]] = await db.query(
            "SELECT crew_id, role ,email , name FROM crew_members WHERE crew_id = ?",
            [crew_id]
        );

        if (!crew) {
            return res.status(404).json({
                success: false,
                message: "Crew member not found"
            });
        }

        if (crew.role !== duty_role) {
            return res.status(400).json({
                success: false,
                message: "Crew role does not match duty role"
            });
        }

        /* --------------------------------------------------
           2️⃣ Validate flight
        -------------------------------------------------- */
        const [[flight]] = await db.query(
            `SELECT 
         flight_id,
         flight_no,
         departure_time,
         arrival_time,
         airline
       FROM flights
       WHERE flight_id = ?`,
            [flight_id]
        );

        if (!flight) {
            return res.status(404).json({
                success: false,
                message: "Flight not found"
            });
        }

        const dutyDate = new Date(flight.departure_time)
            .toISOString()
            .slice(0, 10);

        /* --------------------------------------------------
           3️⃣ Prevent duplicate assignment
        -------------------------------------------------- */
        const [existing] = await db.query(
            `SELECT assignment_id FROM crew_assignments
       WHERE crew_id = ? AND flight_id = ?`,
            [crew_id, flight_id]
        );

        if (existing.length) {
            return res.status(409).json({
                success: false,
                message: "Crew already assigned to this flight"
            });
        }


        // Check daily duty hours (Max 8 hours)

        const [[dailyHours]] = await db.query(
            `SELECT 
         IFNULL(SUM(
           TIMESTAMPDIFF(
             HOUR,
             f.departure_time,
             f.arrival_time
           )
         ), 0) AS total_hours
       FROM crew_assignments d
       JOIN flights f ON f.flight_id = d.flight_id
       WHERE d.crew_id = ?
         AND DATE(f.departure_time) = ?`,
            [crew_id, dutyDate]
        );

        const currentFlightHours =
            (new Date(flight.arrival_time) -
                new Date(flight.departure_time)) / 36e5;

        if (dailyHours.total_hours + currentFlightHours > 8) {
            return res.status(400).json({
                success: false,
                message: "Crew daily duty hours exceeded"
            });
        };



        // 2 Pilots + 2 Cabin Crew + 1 Engineer + 1 Attendant

        const CREW_LIMITS = {
            PILOT: 2,
            CABIN_CREW: 2,
            ENGINEER: 1,
            ATTENDANT: 1
        };

        if (!CREW_LIMITS[duty_role]) {
            return res.status(400).json({
                message: "Invalid duty role"
            });
        }

        const [assigned] = await db.execute(
            `SELECT COUNT(*) AS count 
     FROM crew_assignments 
     WHERE flight_id = ? AND role = ?`,
            [flight_id, duty_role]
        );

        if (assigned[0].count >= CREW_LIMITS[duty_role]) {
            return res.status(400).json({
                message: `${duty_role} limit reached for this flight`
            });
        }


        //bussy crew 

        const [busyCrew] = await db.execute(
            `SELECT * FROM crew_assignments fca
   JOIN flights f ON fca.flight_id = f.flight_id
   WHERE fca.crew_id = ?
   AND f.departure_time = ?`,
            [crew_id, flight.departure_time]
        );

        if (busyCrew.length > 0) {
            return res.status(400).json({
                message: "Crew already assigned to another flight at this time"
            });
        }


        //    5️ Assign crew to flight

        await db.query(
            `INSERT INTO crew_assignments
       (crew_id, flight_id, role, duty_date)
       VALUES (?, ?, ?, ?)`,
            [crew_id, flight_id, duty_role, dutyDate]
        );
        console.log(crew)
        await transporter.sendMail(
            {
                from: `"Operations Team" <${process.env.MAIL_USER}>`,
                to: crew.email,
                subject: `Flight Duty Assigned – ${flight.flight_no}`,
                text: `
                 Dear ${crew.name},

                 You have been assigned flight duty.

                 Flight: ${flight.flight_no}
                     Role: ${crew.role}
                     Departure: ${flight.departure_time}
                     Arrival: ${flight.arrival_time}

                      Please report on time.

                     – ${flight.airline} Ops
                      `
            }
        )
        return res.status(201).json({
            success: true,
            message: "Crew successfully assigned to flight"
        });

    } catch (error) {
        console.error("Crew Flight Assignment Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to assign crew to flight"
        });
    }
};



const getAllCrewMembers = async (req, res) => {
    try {
        const [crew] = await db.query(
            `SELECT 
        crew_id,
        name,
        role,
        phone,
        email,
        salary,
        address
       FROM crew_members`
        );
        if (!crew) {
            return res.status(404).json({
                success: false,
                message: "No crew members found"
            });
        }

        return res.status(200).json({
            success: true,
            count: crew.length,
            data: crew
        });

    } catch (error) {
        console.error("Get Crew Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch crew members"
        });
    }
};

module.exports = { addNewCrewMember, login, assignCrewToFlight, getAllCrewMembers };