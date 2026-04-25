const db = require("../config/db");
const transporter = require("../config/nodemailer.js");
// booking
const reserveFlight = async (req, res) => {
    const id = req.user.user_id;
    if (!id) return res.json({ success: false, message: 'User not logged in' });

    const { passengerName, age, passengerEmail, jurneyDate, address, flight_no, flightClass, airline } = req.body;

    if (!passengerName || !passengerEmail || !address || !age || !jurneyDate || !flight_no || !flightClass || !airline) {
        return res.status(400).json({ success: false, message: 'Missing details' });
    }

    try {
        // Get flight
        const [flights] = await db.query("SELECT * FROM flights WHERE flight_no = ?", [flight_no]);
        if (!flights.length) {
            return res.status(404).json({ success: false, message: 'Flight Not Available' });
        }

        const flight = flights[0];

        // Seat availability
        let SeatAvailbility = 0;
        if (flightClass === 'economy') SeatAvailbility = flight.total_seats_economy - flight.booked_seats_economy;
        if (flightClass === 'business') SeatAvailbility = flight.total_seats_business - flight.booked_seats_business;
        if (flightClass === 'first') SeatAvailbility = flight.total_seats_first - flight.booked_seats_first;

        if (SeatAvailbility <= 0) {
            console.log('No seats available');
            return res.status(400).json({ success: false, message: 'No seats available' });
        }
        const formatedDate = new Date(jurneyDate).toISOString().slice(0, 19).replace("T", " ")


        // Reserve entry (pending status)
        const query = `
            INSERT INTO bookings (user_id, flight_no, flight_id, passenger_name, age, address, email, class, airline, journeyDate,status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
        `;

        const [result] = await db.query(query, [
            id,
            flight_no,
            flight.flight_id,
            passengerName,
            parseInt(age),
            address,
            passengerEmail,
            flightClass,
            airline,
            formatedDate,
            "pending"
        ]);

        return res.status(200).json({
            success: true,
            message: "Seat reserved. Complete payment to confirm.",
            reservation_id: result.insertId
        });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
    }
};


//confirmed reservation

const confirmFlight = async (req, res) => {
    const { reservation_id, payment_id } = req.body;

    if (!reservation_id) {
        return res.status(400).json({ success: false, message: "Missing reservation ID" });
    }

    try {
        const [rows] = await db.query("SELECT * FROM bookings WHERE booking_id = ?", [reservation_id]);
        if (!rows.length) return res.status(404).json({ success: false, message: "Reservation not found" });

        const booking = rows[0];

        if (booking.status === "confirmed") {
            return res.status(200).json({ success: true, message: "Already confirmed", PNR: booking.PNR });
        }

        // Fetch flight details
        const [flightData] = await db.query("SELECT * FROM flights WHERE flight_no = ?", [booking.flight_no]);
        const flight = flightData[0];

        // Generate PNR
        const PNR = Math.floor(100000 + Math.random() * 900000).toString();

        let bookedSeat = 0;
        let seatColumn = "";

        if (booking.class === "economy") {
            bookedSeat = flight.booked_seats_economy + 1;
            seatColumn = "booked_seats_economy";
        } else if (booking.class === "business") {
            bookedSeat = flight.booked_seats_business + 1;
            seatColumn = "booked_seats_business";
        } else {
            bookedSeat = flight.booked_seats_first + 1;
            seatColumn = "booked_seats_first";
        }
        const formattedFinalDate = new Date(booking.journeyDate)
            .toISOString()
            .slice(0, 19) // removes .000Z
            .replace("T", " ");


        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Mark confirmed
            await db.query(
                "UPDATE bookings SET status = ?, PNR = ?, seat_no = ?, payment_id = ? WHERE booking_id = ?",
                ["confirmed", PNR, bookedSeat, payment_id ?? null, reservation_id]
            );

            // Update flight seats
            await db.query(
                `UPDATE flights SET ${seatColumn} = ? WHERE flight_no = ?`,
                [bookedSeat, booking.flight_no]
            );

            // Insert ticket
            await db.query(
                `INSERT INTO tickets (booking_id, PNR, flight_no, source, destination, journey_date, seat_no, class, airline)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    reservation_id,
                    PNR,
                    flight.flight_no,
                    flight.source,
                    flight.destination,
                    formattedFinalDate,
                    bookedSeat,
                    booking.class,
                    booking.airline
                ]
            );

            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        }

        return res.status(200).json({
            success: true,
            message: "Ticket confirmed successfully",
            PNR
        });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: "Error: " + error.message });
    }
};

// ticket details
const ticketView = async (req, res) => {
    const { PNR } = req.body;
    if (!PNR) return res.status(404).json({ success: false, message: 'Enter PNR Number' }

    )
    try {
        const [ticket] = await db.query('SELECT * FROM tickets WHERE PNR=?', [PNR]);
        if (ticket.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket Not Found'
            });
        }
        res.status(200).json({
            success: true,
            ticket: ticket[0]
        })
    } catch (error) {

        res.status(500).json({ success: false, message: 'Internal server error' + error })
    }
}
//
const cancel = async (req, res) => {
    const { ticket_number } = req.body;
    const user_id = req.user.user_id;
    if (!ticket_number) return res.status(200).json({
        success: false,
        message: 'missing ticket Number'
    });

    try {
        const [ticket] = await db.query("select *from tickets where ticket_number =? ", [ticket_number]);
        if (ticket.length <= 0) return res.status(404).json({ success: false, message: "Ticket not found" });
        if (ticket[0].status == 'cancelled') return res.status(200).json({ success: true, message: "Your ticket is already cancelled" })
        const [booking] = await db.query("select * from bookings where booking_id = ? ", [ticket[0].booking_id])
        if (booking[0].user_id == user_id) {
            await db.query("update tickets set status = 'cancelled' where ticket_number = ? ", [ticket_number])
            await db.query("update bookings set status = 'cancelled' where booking_id = ? ", [ticket[0].booking_id])
            res.status(200).json({ success: true, message: "Ticket Cancelled Successfully" })
        }

        const otp = Math.floor(1000 + Math.random() * 900);
        await transporter.sendMail({
            from: ` "AirlLine" ${process.env.EMAIL_USER} `,
            to: booking[0].email,
            subject: 'Ticket cancellation OTP',
            html: `<h2> Hi ${booking[0].passenger_name}, <br> Your OTP code is ${otp}. It is valid for 5 minutes.</h2>`
        });
        await db.query("update bookings set cancellation_otp = ? where booking_id = ? ", [otp, booking[0].booking_id])
        res.status(202).json({ success: true, message: "OTP sent to Passenger email for cancellation verification" })

        //sending otp to ticket cancelling
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' + error })
    }

}//
const myBookings = async (req, res) => {
    const user_id = req.user.id || req.user.user_id;

    try {
        const [myBookings] = await db.query("SELECT * from bookings WHERE user_id = ? ", [user_id])
        if (myBookings.length === 0) return res.status(404).json({ success: false, message: "No Booking Found" });
        res.status(200).json({ success: true, message: "Your Bookings", booking: myBookings })
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' + error })
    }
}
const verifyCancelation = async (req, res) => {
    const user_id = req.user.user_id;
    const { otp, booking_id } = req.body;
    if (!otp) return res.status(404).json({ success: false, message: "Missing OTP" });
    if (!user_id) return res.status(404).json({ success: false, message: "please Login" })
    try {
        const [booking] = await db.query("select status, booking_id,cancellation_otp from bookings where booking_id  = ? ", [booking_id])
        console.log(booking[0])
        if (booking[0].status == 'cancelled') return res.status(200).json({ success: true, message: "Your ticket is already cancelled" })
        if (String(booking[0].cancellation_otp) != String(otp)) return res.status(404).json({ success: false, message: "Wrong OTP" });

        await db.beginTransaction()
        try {
            await db.query("update bookings set status = 'cancelled' where booking_id = ? ", [booking[0].booking_id])
            await db.query("update tickets set status = 'cancelled' where booking_id = ? ", [booking[0].booking_id])

            await db.commit()
        }
        catch (Err) {
            await db.rollback();
            throw Err;
        }
        res.status(200).json({ success: true, message: "Ticket Cancelled Successfully" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'Internal server error' + error })
    }
}
module.exports = { reserveFlight, confirmFlight, myBookings, ticketView, cancel, verifyCancelation }