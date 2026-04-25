// your admin model
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1️⃣ Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Missing details"
            });
        }

        // 2️⃣ Find admin
        const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [username]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        const admin = rows[0];
        if (admin.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        // 3️⃣ Check password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // 4️⃣ Create JWT token
        const token = jwt.sign(
            { id: admin.id, username: admin.email, role: "ADMIN" },
            process.env.SECRET,
            { expiresIn: "7d" }
        );
        res.cookie('adminToken', token, {
            httpOnly: true,   // cannot be accessed by JS (protects from XSS)
            secure: false,    // set to true if using HTTPS
            sameSite: 'lax',  // CSRF protection
            maxAge: 3600000
        })
        // 5️⃣ Success response
        res.status(200).json({
            success: true,
            message: "Login successful",
        
            admin: {
                id: admin.id,
                username: admin.email,
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};



const scheduleFlight = async (req, res) => {
    try {
        const {
            flight_no,
            source,
            destination,
            status,
            departure_time,
            arrival_time,
            economy_total_seats,
            business_total_seats,
            first_total_seats,
            airline,
            first_fare,
            economy_fare,
            business_fare,
            aircraft_id
        } = req.body;

        // ---------------------------
        // 1️⃣ Validate Empty Fields
        // ---------------------------
        const requiredFields = {
            flight_no,
            source,
            destination,
            status,
            departure_time,
            arrival_time,
            economy_total_seats,
            business_total_seats,
            first_total_seats,
            airline,
            first_fare,
            economy_fare,
            business_fare,
            aircraft_id
        };

        for (let key in requiredFields) {
            if (!requiredFields[key]) {
                return res.status(400).json({
                    success: false,
                    message: `${key} is required`
                });
            }
        }

        // -------------------------------------
        // 2️⃣ Source & Destination Validation
        // -------------------------------------
        if (source === destination) {
            return res.status(400).json({
                success: false,
                message: "Source and destination cannot be the same"
            });
        }

        // -------------------------------------
        // 3️⃣ Validate Seat Numbers
        // -------------------------------------
        const seatFields = {
            economy_total_seats,
            business_total_seats,
            first_total_seats
        };

        for (let key in seatFields) {
            if (isNaN(seatFields[key]) || seatFields[key] < 0) {
                return res.status(400).json({
                    success: false,
                    message: `${key} must be a positive number`
                });
            }
        }

        // -------------------------------------
        // 4️⃣ Validate Fare Values
        // -------------------------------------
        const fareFields = {
            first_fare,
            economy_fare,
            business_fare
        };

        for (let key in fareFields) {
            if (isNaN(fareFields[key]) || fareFields[key] <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `${key} must be a number greater than 0`
                });
            }
        }

        // -------------------------------------
        // 5️⃣ Validate Date/Time
        // -------------------------------------
        const departure = new Date(departure_time);
        const arrival = new Date(arrival_time);

        if (isNaN(departure.getTime()) || isNaN(arrival.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format"
            });
        }

        if (arrival <= departure) {
            return res.status(400).json({
                success: false,
                message: "Arrival time must be after departure time"
            });
        }

        // -------------------------------------
        // 6️⃣ Insert into Database
        // -------------------------------------
        await db.execute(
            `INSERT INTO flights (
      flight_no, source, destination, status,
      departure_time, arrival_time,
      total_seats_economy, total_seats_business,total_seats_first,
      airline, first_fare, economy_fare, business_fare,
      aircraft_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                flight_no,
                source,
                destination,
                status,
                departure_time,
                arrival_time,
                economy_total_seats,
                business_total_seats,
                first_total_seats,
                airline,
                first_fare,
                economy_fare,
                business_fare,
                aircraft_id
            ]
        );


        return res.status(201).json({
            success: true,
            message: "Flight scheduled successfully!"
        });

    } catch (error) {
        console.error("Schedule Flight Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = { login, scheduleFlight };
