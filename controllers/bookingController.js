const db = require("../config/db");
const transporter = require("../config/nodemailer.js");
// booking
const bookflight = async (req, res) => {
    const id = req.user.user_id;
    if (!id) return res.json({ success: false, message: 'user not login' });
    const { passengerName, age, passengerEmail, jurneyDate, address, flght_no, flightClass , airline } = req.body;
    if (!passengerName || !passengerEmail || !address || !age || !jurneyDate || !flght_no || !flightClass || !airline) {
        return res.status(404).json({ success: false, message: 'Missing details' })
    }

    // generating ticket number
    function GenerateTicketNumber() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    try {
        // checking seat availability
        const [flights] = await db.query("SELECT * FROM flights where flight_no = ?", [flght_no])
        if (!flights || flights.length === 0) {
            return res.status(401).json({ success: false, message: 'Flight Not Available' })
        }
        const flight = flights[0];

        // check seat availability
        let SeatAvailbility = 0;
        let bookedSeat = 0;
        if (flightClass == 'economy') {
            SeatAvailbility = flight.total_seats_economy - flight.booked_seats_economy;
            bookedSeat = flight.booked_seats_economy;
        }
        else if (flightClass === 'business') {
            SeatAvailbility = flight.total_seats_business - flight.booked_seats_business;
            bookedSeat = flight.booked_seats_business;
        }
        else if (flightClass === 'first') {
            SeatAvailbility = flight.total_seats_first - flight.booked_seats_first;
            bookedSeat = flight.booked_seats_first;
        }
        else {
            return res.status(404).json({ success: false, message: 'Invalid Class' })
        }
        if (SeatAvailbility <= 0) {
            return res.status(404).json({ success: false, message: 'No Seats Available in ' + flightClass + ' Class' })
        }
        const ticket_number = GenerateTicketNumber();
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction()
            const query = 'INSERT INTO bookings (user_id, flight_no, flight_id, seat_no, passenger_name, age,address , email, class , airline , PNR) VALUES (?, ?, ?, ?, ?, ?, ?,? , ?,? ,?)'
            const bookResult = await db.query(query, [
                id,             // user_id INT
                flght_no,       // flight_no VARCHAR
                flight.flight_id,       // flight_id INT
                bookedSeat + 1,         // seat_no INT or VARCHAR
                passengerName,  // passenger_name VARCHAR
                parseInt(age),
                address,  // age INT
                passengerEmail, // email VARCHAR
                flightClass  ,// class VARCHAR
                airline ,
                ticket_number  // eg . indiGo , Air india etc
            ]);
            if (bookResult[0].affectedRows === 0) return res.status(303).json({ success: false, message: "Booking Failed" })
            // update booked seats
            await db.query(`update flights set booked_seats_${flightClass} = ? where flight_no = ?  `, [bookedSeat + 1, flght_no]);

            await db.query(`INSERT INTO TICKETS (booking_id, PNR,flight_no ,source, destination, journey_date, seat_no, class , airline) values (?, ?, ?, ?, ?, ?, ?,? ,?)`, [bookResult[0].insertId, ticket_number, flght_no, flight.source, flight.destination, jurneyDate, bookedSeat + 1, flightClass, airline])

            await connection.commit();

        } catch (Err) {
            await connection.rollback();
            throw Err;
        }
        res.status(200).json({ success: true, message: 'Reservation Booked Successfully', PNR: ticket_number })
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' + error.message })
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
module.exports = { bookflight, myBookings, ticketView, cancel, verifyCancelation }